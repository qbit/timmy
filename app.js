var sqlite = require( 'node-sqlite3' ),
	xmpp = require( 'simple-xmpp' ),
	optparse = require( 'optparse' ),
	fs = require( 'fs' ),
	db_file = __dirname + '/timmy.db',
	db = new sqlite.Database( db_file ),
	running_timers = {};

fs.stat( db_file, function( err, stat ) {
	if ( stat.size === 0 ) {
		console.log( "Creating db..." );
		db.serialize( function() {
			db.run( 'create table categories ( id integer primary key autoincrement, name text )' );
			db.run( 'create table projects( id integer primary key autoincrement, name text )' );
			db.run( 'create table users( id integer primary key autoincrement, name text )' );
			db.run( 'create table times( id integer primary key autoincrement, name text, categoryid integer, projectid integer, userid integer, begin timestamp, end timestamp )' );
		});
	}
});

var switches = [
	[ '-h', '--help', 'Shows this help' ],
	[ '-j', '--jid JID', 'XMPP jid' ],
	[ '-p', '--password PASSWORD', 'XMPP Password' ],
	[ '-s', '--host HOST', 'XMPP Server' ],
	[ '-n', '--port PORT', 'XMPP Port ( default 5222 )' ],
];

var parser = new optparse.OptionParser(switches);

var options = {};

function single_insert( val, table ) {
	var st = db.prepare( 'insert into ' + table + ' ( name ) values ( ? )' );
	st.run( val );
	st.finalize();
}

function get_names( to, table ) {
	var names = [];
	db.all( 'select * from ' + table, function( err, rows ) {
		var i, l;
		names.push( rows.length + ' entrie(s) found' );
		for ( i = 0, l = rows.length; i < l; i++ ) {
			names.push( '\n' + rows[i].id + '. ' + rows[i].name );
		}

		xmpp.send( to, names.join( ',' ) );
	});
}

function start_tracking( to, cat, proj ) {
	console.log( "to: %s, cat: %s, proj: %s", to, cat, proj );
}

var cmds = {
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
		users: function( to, table ) {
			get_names( to, table );
		}
	},
	start: function( to, cat, proj ) {
		start_tracking( to, cat, proj );
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

parser.parse( process.argv );

function process_cmd( from, msg ) {
	var parts = msg.split( /\s/ );

	var cmd = parts[0];
	parts.shift();

	var scmd = parts[0];
	parts.shift();

	var option = parts.join( ' ' );

	console.log( 'CMD: %s, SubCMD: %s, Rest: "%s"', cmd, scmd, option );

	if ( ! cmds[ cmd ] ) {
		xmpp.send( from, "Unknown Command: " + cmd );
	} else {
		if ( cmds[ cmd ][ scmd ] ) {
			cmds[ cmd ][ scmd ]( from, option || scmd );
		} else {
			cmds[ cmd ]( from, scmd, option )
		}
	}
}

xmpp.on( 'chat', function( from, message ) {
	console.log( "%s -> %s", from, message );
	process_cmd( from, message );
});

xmpp.on( 'online', function() {
	console.log( "connected.." );
});

xmpp.on( 'error', function( err ) {
	console.log( err );
});

xmpp.connect( {
	jid: options.jid,
	password: options.password,
	host: options.host,
	port: options.port || 5222
});
