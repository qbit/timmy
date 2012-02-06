# Timmy - a time tracking XMPP bot
Timmy supports categories and projects. Categories are general purpose containers like 'Meeting' or 'Development'.  Projects are generally things like a project name ( 'Timmy' for example ).

Timmy keeps inserts a start time when it receives the command ( you must have previously added <category> and <project> with the "add project" or "add category" commands ): 
	"start <category> <project>"

- Author: Aaron Bieber

## Installation
	* Not published yet!
	npm install timmy

## Command Line Options
	-h, --help                Shows this help
	-j, --jid JID             XMPP jid
	-p, --password PASSWORD   XMPP Password
	-s, --host HOST           XMPP Server
	-d, --debug DEBUG         Debug Messages ( 1-3, 3 being most verbose )
	-n, --port PORT           XMPP Port ( default 522

## Using Timmy

# Adding a Category:
	xmpp> add category Development
	(07:55:42) Time Tracker: category "Development" added.	

# Adding a Project:
	xmpp> add project Timmy
	(07:55:46) Time Tracker: project "Timmy" added.	
	
# Listing Projects:
	xmpp> list projects
	xmpp> ls proj

# Listing Categories:
	xmpp> list categories
	xmpp> ls cat

# List Projects and Categories:
	xmpp> list all

# Starting and Ending tracking:
	xmpp> start <categoryid> <projectid>
	xmpp> end <categoryid> <projectid>
	
