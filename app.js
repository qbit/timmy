var sqlite = require( 'node-sqlite3' ),
	xmpp = require( 'node-xmpp' ),
	fs = require( 'fs' ),
	db_file = __dirname + '/timmy.db',
	db = new sqlite.Database( db_file );


fs.stat( db_file, function( err, stat ) {
	if ( stat.size === 0 ) {
		console.log( "Creating db..." );
		db.serialize( function() {
			db.run( 'create table categories ( id integer primary key, name text )' );
			db.run( 'create table projects( id integer primary key, name text )' );
			db.run( 'create table times( id integer primary key, name text, categoryid integer, projectid integer, begin timestamp, end timestamp )' );
		});
	}
});
