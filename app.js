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

var cmds = {
	add: {
		project: function( proj ) {
			single_insert( proj, 'projects' );
		},
		category: function( cat ) {
			single_insert( cat, 'categories' );
		},
		user: function( user ) {
			single_insert( user, 'users' );
		}
	},
	rm: {
		project: "",
		category: "",
		user: ""
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

xmpp.on( 'chat', function( from, message ) {
	console.log( from );
	console.log( message );
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
