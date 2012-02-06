var sqlite = require( 'node-sqlite3' ),
	async = require( 'async' ),
	xmpp = require( 'simple-xmpp' ),
	optparse = require( 'optparse' ),
	fs = require( 'fs' ),
	db_file = __dirname + '/timmy.db',
	db = new sqlite.Database( db_file ),
	parser,
	options,
	switches,
	cmds
	running_timers = {};

function debug( level, msg ) {
	switch( options.debug ) {
		case '1':
			if ( level === 1 ) {
				console.log( msg );
			}
			break;
		case '2':
			if ( level === 2 ) {
				console.log( msg );
			}
			break;
		case '3':
			if ( level === 3 ) {
				console.log( msg );
			}
			break;
	}
}

fs.stat( db_file, function( err, stat ) {
	if ( stat.size === 0 ) {
		db.serialize( function() {
			db.run( 'create table categories ( id integer primary key autoincrement, name text )' );
			db.run( 'create table projects( id integer primary key autoincrement, name text )' );
			db.run( 'create table users( id integer primary key autoincrement, name text )' );
			db.run( 'create table times( id integer primary key autoincrement, name text, categoryid integer, projectid integer, userid integer, begin timestamp, end timestamp )' );

			debug( 1, "database created.." );
		});
	}
});

switches = [
	[ '-h', '--help', 'Shows this help' ],
	[ '-j', '--jid JID', 'XMPP jid' ],
	[ '-p', '--password PASSWORD', 'XMPP Password' ],
	[ '-s', '--host HOST', 'XMPP Server' ],
	[ '-d', '--debug DEBUG', 'Debug Messages ( 1-3, 3 being most verbose )' ],
	[ '-n', '--port PORT', 'XMPP Port ( default 5222 )' ],
];

parser = new optparse.OptionParser( switches );

options = {};

function single_insert( val, table, fn ) {
	debug( 3, "inserting into " + table );
	var st = db.prepare( 'insert into ' + table + ' ( name ) values ( ? )' );
	st.run( val );
	st.finalize();
	if ( fn ) {
		fn();
	}
}

function get_names( to, table ) {
	var names = [];
	debug( 3, "getting names from " + table );
	db.all( 'select * from ' + table, function( err, rows ) {
		var i, l;
		names.push( rows.length + ' entrie(s) found' );
		for ( i = 0, l = rows.length; i < l; i++ ) {
			names.push( '\n' + rows[i].id + '. ' + rows[i].name );
		}

		xmpp.send( to, names.join( ',' ) );
	});
}

function get_val( table, val, fn ) {
	var sql;
	if ( val.indexOf( '@' ) ) {
		sql = 'select * from ' + table + ' where id = "' + val + '" or name = "' + val + '"';
	} else {
		sql = 'select * from ' + table + ' where id = ' + val + ' or name = ' + val;
	}

	debug( 3, sql );

	db.all( sql, function( err, rows ) {
		if ( err ) {
			fn.call( null, err );
		} else {
			fn.call( null, null, rows );
			res = rows;
		}
	});
}

function start_tracking( to, cat, proj ) {

	var o = {};

	if ( ! running_timers[ to ] ) {
		running_timers[ to ] = {};
	}

	async.series( [
		function( cb ) { 
			get_val( 'users', to, function( err, res ) {
				if ( err || res.length === 0 ) {
					single_insert( to, 'users', function() {
						get_val( 'users', to, function( e, r ) {
							if ( e ) {
								throw e;
							}
							o.user = r[0].name;
							o.u_id = r[0].id;
						});
					});
				} else {

					o.user = res[0].name;
					o.u_id = res[0].id;
					cb();
				}
			});
		},

		function( cb ) { 
			get_val( 'categories', cat, function( err, res ) {
				if ( err ) {
					throw err;
				} else {
					o.cat = res[0].name;
					o.c_id = res[0].id;
					cb();
				}
			});
		},

		function( cb ) {
			get_val( 'projects', proj, function( err, res ) {
				if ( err ) {
					throw err;
				} else {
					o.proj = res[0].name;
					o.p_id = res[0].id;
					cb();
				}
			});
		}, 
		function( cb ) {
			if ( ! running_timers[ to ].start ) {
				xmpp.send( to, 'Started tracking time for: ' + o.cat + ':' +  o.proj );
				var st = db.prepare( "insert into times ( categoryid, projectid, userid, begin ) values ( ?, ?, ?, datetime('now') )" );
				st.run( [ o.c_id, o.p_id, o.u_id ] );
				st.finalize();
				running_timers[ to ].start = true;
			} else {
				xmpp.send( to, 'You currently have a running timer, please end it before continuing!' );
			}
			cb();
		}
	]);
}

function end_tracking( to, cat, proj ) {
	var userid;

	async.series( [
		function( cb ) {
			get_val( 'users', to, function( err, res ) {
				if ( err ) {
					throw err;
				} else {
					userid = res[0].id
				}
				cb();
			});
		},
		function( cb ) {
			if ( running_timers[ to ] && running_timers[ to ].start ) {
				var sql = "\
					update\
						times\
					set\
						end = datetime( 'now' )\
					where\
						userid = '" + userid + "' and\
						categoryid = " + cat + " and\
						end is null and\
						projectid = " + proj + "\
				";

				db.run( sql );
				xmpp.send( to, 'Ending time tracking' );
				running_timers[ to ].start = false;
			} else {
				xmpp.send( to, 'Currently, you have no running timers.' );
			}
		}
	]);
}

cmds = {
	add: {
		project: function( to, proj ) {
			single_insert( proj, 'projects' );
			xmpp.send( to, 'project "' + proj + '" added.' );
		},
		category: function( to, cat ) {
			single_insert( cat, 'categories' );
			xmpp.send( to, 'category "' + cat + '" added.' );
		},
		user: function( to, user ) {
			single_insert( user, 'users' );
			xmpp.send( to, 'user "' + user + '" added.' );
		}
	},

	remove: {
		project: "",
		category: "",
		user: ""
	},

	list: {
		projects: function( to, table ) {
			get_names( to, table );
		},
		categories: function( to, table ) {
			get_names( to, table );
		},
		all: function( to, table ) {
			get_names( to, 'categories' );
			get_names( to, 'projects' );
		},
		users: function( to, table ) {
			get_names( to, table );
		}
	},

	ls: {
		pro: function( to, table ) {
			get_names( to, 'projects' );
		},
		cat: function( to, table ) {
			get_names( to, 'categories' );
		},
		users: function( to, table ) {
			get_names( to, 'users' );
		}
	},

	start: function( to, cat, proj ) {
		start_tracking( to, cat, proj );
	},

	end: function( to, cat, proj ) {
		end_tracking( to, cat, proj );
	}
};

parser.on( 'help', function() {
	console.log( parser.toString() );
	process.exit( 0 );
});

parser.on( 'jid', function( opt, val ) {
	options.jid = val;
});

parser.on( 'password', function( opt, val ) {
	options.password = val;
});

parser.on( 'host', function( opt, val ) {
	options.host = val;
});

parser.on( 'port', function( opt, val ) {
	options.port = val;
});

parser.on( 'debug', function( opt, val ) {
	options.debug = val || 1;
});

parser.parse( process.argv );

function isFun( obj ) {
	return toString.call(obj) === "[object Function]";
}

function process_cmd( from, msg ) {
	var parts = msg.split( /\s/ );

	var cmd = parts[0];
	parts.shift();

	var scmd = parts[0];
	parts.shift();

	var option = parts.join( ' ' );

	debug( 1, 'CMD: ' + cmd + ', SubCMD: ' + scmd + ', Rest: "' + option + '"' );

	if ( ! cmds[ cmd ] ) {
		xmpp.send( from, "Unknown Command: " + cmd );
	} else {
		if ( cmds[ cmd ][ scmd ] ) {
			cmds[ cmd ][ scmd ]( from, option || scmd );
		} else {
			if ( cmds[ cmd ] && isFun( cmds[ cmd ] ) ) {
				cmds[ cmd ]( from, scmd, option )
			} else {
				xmpp.send( from, "Unknown Subcommand or Option!" );
			}
		}
	}
}

xmpp.on( 'chat', function( from, message ) {
	debug( 1, from + " -> " + message );
	process_cmd( from, message );
});

xmpp.on( 'online', function() {
	debug( 1, "connected to xmpp" );
});

xmpp.on( 'error', function( err ) {
	throw err;
});

xmpp.connect( {
	jid: options.jid,
	password: options.password,
	host: options.host,
	port: options.port || 5222
});
