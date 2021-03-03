# client
Application that uses the RESTful API written with the Aurelia framework

Dependency structure
```
Development > Server > Client > CSV, Pouch
```

### Restart Server (Reboot, Change Instance Type)
```
#mount volume
lsblk                            #details http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-using-volumes.html
sudo mount /dev/<volume> /dscsa  #most likely nvme1n1

#start server
sudo node /dscsa/node_modules/server        
ctrl c (to stop server)
sudo forever start /dscsa/node_modules/server  #forever list, forever stop
```

### install development
##### note: dscsa/development is a large install because it depends on gulp for bundling, babel for transpiling, and protractor for testing.
- [install node](https://nodejs.org/en/download/current)
- [install couchdb](http://couchdb.apache.org/#download)
- install git (dialog will appear on first use of git clone command)

```
# create and cd into the folder in which you want to install
npm install dscsa/development
rm -R dscsa/node_modules/server
rm -R dscsa/node_modules/client
rm -R dscsa/node_modules/pouch
rm -R dscsa/node_modules/dscsa

# Github Client -> "Clone Repository..."
server -> dscsa/node_modules/server
client -> dscsa/node_modules/client
pouch -> dscsa/node_modules/pouch
csv -> dscsa/node_modules/csv

# build the client with watch and run server
# will ask for couchdb credentials on first run
# should work from localhost and localhost:9000
sudo npm start

# run protractor end-to-end tests
# must run after sudo npm start
# close browser windows w/ app
sudo npm test
```
```
- Your Installation Folder
  - package.json
  - keys     (added after running sudo npm start the first time)
    - dev.js (with your couchdb credentials)
  - node_modules
    - client (github repo)
    - server (github repo)
    - csv    (github repo)
    - pouch  (github repo)
    - many dependencies (gulp, babel, protractor, koa, pouchdb)
```

## install production into dscsa folder (ubuntu)
```
- /dscsa #installation folder
  - couchdb
  - package.json
  - keys     (added after running sudo npm start the first time)
    - dev.js (with your couchdb credentials)
  - node_modules
    - client (github repo)
    - server (github repo)
    - csv    (github repo)
    - pouch  (github repo)
    - some dependencies (koa, pouchdb)
```
```
# Launch instance in EC2.  Currently using 1c-west and Ubuntu 16
ssh -i /path/to/private-key ubuntu@<elastic-ip>
# to enable additional key pairs
- login to another instance with that keypair,
- sudo nano ~/.ssh/authorized_keys,
- Esc then $ for soft-wrapping,
- Copy and paste that into same location on new instance
- Remove line breaks from soft-wrap
- Test ssh login with new key pair

#mount volume
sudo mkdir /dscsa
lsblk                            #details http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-using-volumes.html
sudo mkfs -t ext4 /dev/<volume>  #only make filesystem, if new empty volume.
sudo mount /dev/<volume> /dscsa  #most likely nvme1n1
cd /dscsa

#install couchdb http://docs.couchdb.org/en/2.2.0/install/unix.html
echo "deb https://apache.bintray.com/couchdb-deb xenial main" | sudo tee -a /etc/apt/sources.list #note: xenial is for Ubuntu 16
curl -L https://couchdb.apache.org/repo/bintray-pubkey.asc | sudo apt-key add -
sudo apt-get update && sudo apt-get install couchdb # select option for standalone, 0.0.0.0, set db password

# goto <elastic-ip>:5984/_utils.  CouchDB should have been started automatically
enable CORS
[fabric] request_timeout 120000
[compactions] _default [{db_fragmentation, "5%"}, {view_fragmentation, "5%"},{from, "00:00"}, {to, "04:00"}]
[couch_httpd_auth] "timeout" is the same as other instances if using a Load Balancer
[couch_httpd_auth] "secret" is the same as other instances if using a Load Balancer #this will log you out


#If you get logged out of Fauxton settings available at /dscsa/couchdb/etc/local.ini
#If you need to change password goto [admins] <username> <new password> after refreshing new password should get hashed
https://stackoverflow.com/questions/43958527/does-couchdb-2-sync-user-sessions-across-nodes
http://mail-archives.apache.org/mod_mbox/couchdb-user/201705.mbox/%3CCAB2Gbkw4FdhUuBJ6ErBBo4vnC8ANzGQ3AS6ua-uB032Km6zOgQ@mail.gmail.com%3E

###
#start if new instance, move files to non-bootable drive
sudo mv /opt/couchdb /dscsa/couchdb
sudo ln -s /dscsa/couchdb /opt/couchdb
#after sudo service couchdb restart, fauxton should still work

sudo rm /opt/couchdb/data
sudo mv /var/lib/couchdb /dscsa/couchdb/data
sudo ln -s /dscsa/couchdb/data /var/lib/couchdb
#after sudo service couchdb restart, fauxton should still work

sudo mv /var/log/couchdb /dscsa/couchdb/log
sudo ln -s /dscsa/couchdb/log /var/log/couchdb
#after sudo service couchdb restart, fauxton should still work

###

### Raise File Limits
# Or you will get errors like '"{mochiweb_socket_server,341,{acceptor_error,{error,accept_failed}}} Accept failed error", "{error,emfile}"'
# http://docs.couchdb.org/en/latest/maintenance/performance.html?highlight=ulimit#maximum-open-file-descriptors-ulimit
# https://stackoverflow.com/questions/41103624/emfile-error-running-couchdb-on-ubuntu-16?noredirect=1&lq=1
#

sudo nano /etc/security/limits.conf
  couchdb      hard      nofile    200000
  couchdb      soft      nofile    200000
  root         hard      nofile    200000
  root         soft      nofile    200000


sudo nano /etc/systemd/system/multi-user.target.wants/couchdb.service
  [Service]
  LimitNOFILE=200000

sudo nano /etc/pam.d/common-session
  session required pam_limits.so

#to test file limit was increased
sudo su couchdb
ulimit -n #this should display same number as above e.g., 20000
exit

####

# We need to do 2x Replications to get Two-Way syncing for Each of the 6 Databases
New Server: In fauxton, setup replication for all 6 databases: _users, user, account, shipment, drug, transaction
Old Server: In fauxton, setup replication for all 6 databases: _users, user, account, shipment, drug, transaction

#Source
Remote database
http:<PRIVATE IP>:5984/<DB> # NOTE THIS IS EC2's PRIVATE IP (RARELY USED), NOT ELASTIC IP OR PUBLIC IP WHICH WILL NOT WORK
User name and password

#Target
Remote existing database
http:<PRIVATE IP>:5984/<DB> # NOTE THIS IS EC2's PRIVATE IP (RARELY USED), NOT ELASTIC IP OR PUBLIC IP WHICH WILL NOT WORK
User name and password

Pro Tip: Once one db replication is setup, goto Actions > Wrench (Edit Replication) > Change name to new DB > Erase Document Id
And it will clone the replication document for the new database rather than entering all the information for the 6 databases

#Continuous

###

Add EC2 Console, Register New Instance with Load Balancer's "Target Group"

2 Target Groups
- v2-live-internal/external HTTP on port 80
- v2-fauxton-internal/external HTTP on port 5984

Load Balancer with 3 rules
- HTTP 80; HTTPS 443; HTTPS 8443 #8443 is Cloudflare Compatible Port that will goto CouchDB's Fauxton
- Select PEM/SSL Certificate from Correct Domain
  * if none exists create one in CloudFlare SSL > Origin Server and "Upload to ACM".  You will need to google search CloudFlare's Public Certificate Chain
- Routing
  * HTTP 80 Forward To v2-live-internal/external; (Redirect to 443 seems to create a redirect loop, so need to force HTTPS is Cloudflare)
  * HTTPS 443 Forward To v2-live-internal/external;
  * HTTPS 5984 Forward To v2-fauxton-internal/external

DNS
- In CloudFlare add CNAME of v2.<domain>.org, URL of the AWS Load Balancer, DNS Only

####

#install nodejs and application
#goto https://deb.nodesource.com and find the latest version
curl --silent --location https://deb.nodesource.com/setup_<VERSION>.x | sudo bash -
sudo apt-get install nodejs -y
sudo apt-get install git-core

#Confirm you are in /dscsa directory
sudo npm install dscsa/server                  #make sure you are in the /dscsa directory!
sudo npm install forever -g                    #to do make new repo with this dependency that runs this with
sudo mkdir keys
sudo nano keys/dev.js                          #copy and paste key file from existing instance
sudo node /dscsa/node_modules/server        
ctrl c (to stop server)
sudo forever start /dscsa/node_modules/server  #forever list, forever stop
#log: sudo nano /dscsa/couchdb/log/couchdb.log




```


## If not using a Load Balancer
#Add 2nd static public IP for replication
Goto console.aws.com
  -> Network Interfaces -> Actions -> Manage IP Addresses -> Increment current IP address by one
  -> Elastic IPs -> Associate -> Instance ID -> Select New Private IP
  -> Then SSH into instance and run sudo ip addr add <private ip address>/24 dev ens5
     //if fails to “ip a” to see if “ens5” is correct
     //More info: https://bobcares.com/blog/an-easy-guide-to-setup-amazon-ec2-multiple-ips/2/
     //NOTE: THIS MIGHT NOT SURVIVE RESTARTS!

Right now
Server A*:
Private IPs 172.30.2.173, 172.30.2.174
Public IPs 52.8.112.88 (v2.goodpill.org), 52.52.80.83 (static for replication)

Server B*:
Private IPs 172.30.2.240, 172.30.2.241
Public IPs  52.9.6.78 (Live Inventory Backup), 52.9.98.164 (static for replication)

* To switch live servers, just switch the primary IP addresses (e.g, 52.8.112.88 & 52.9.6.78)

##### Testing Notes
Currently set to visit http://localhost:9000. If that's not right, need to update it in the spec

TO KNOW:
Does not run nicely if you start it and then go to another window of a browser. Creates generally unpredictable behavior.
When the tests get to the Inventory part, there is no clean way to close the print dialogue with this framework, so when it gets there if you're watching, then close the tab. Otherwise I recommend letting the test run with your mous somewhere in the screen. There's a rudimentary plug in to mimic pressing the Escape button, but it's not the most accurate way of focusing on the window.


Components:
	Join Page
		Ensure all required fields   ✔
		Create Accounts ✔
		Logout ✔

 	Login Page ✔
		Login  ✔

	Account Page
		Ensure User Validation
		Add Additional User   ✔
		Delete Additional User  ✔
		Login with other user credentials  ✔
		All Accounts Listed ✔
		Unauthorize all Accounts ✔
		Authorize Several Accounts  ✔

	Drugs Page
		Add a Drug  ✔
		Ensure Drug Validation / Snackbar works
			Import/Export CSV (delay)
		Search Drug by Name and NDC ✔
		Order Drug, Modify Order

	Shipment Page
		Test that From Account field has only authorized accounts ✔
		Create New Shipment ✔
		Filter Shipments by Donor Name and Tracking Number ✔
		Add Various Drugs to Shipment by NDC and Generic ✔
		Ensure you can delete a drug with qty 0 ✔
		Make sure Ordered Drugs are autochecked if meet criteria and not checked if don't ✔
		Make Sure you can manually accept (check) a drug ✔
			Make sure that inputs are marked as valid / invalid depending on input entered
		Test Keyboard Shortcuts (+/-, Enter) ✔
		Refresh Page and Make Sure Everything Saved to DB ✔
		Make sure snackbar messages are correct

	Inventory Page
		Search by Location/Bin, Generic Name, NDC, Expiration ✔
		Ensure CheckAll Box works   ✔
		Ensure that accepted drugs appear  ✔
		Filter drugs by each filter  ✔
		Dispense drugs disappear (including refresh) ✔
		Dispensed drugs cannot be deleted from shipment page
		Pend / Unpend drugs   ✔
		Repack Drugs:       - Added validation to prevent you from repacking more than the quantity 						of transactions you've selected, and from repacking zero vials
		Original disappear ✔
		     print label   ✔ - Has a solution, but requires that you be in the window for it to 						properly execute
		Doesn't allow you to repack more qty than the transactions you've selected
		new drugs appear with icon ✔
		Original repacked drugs cannot be deleted from shipment page ✔
		       Eventually figure out what to do to test database “next” property set, records complete
		Ensure you can delete inventory with 0 qty   - BUGGY prints: "Verified At "2017-														04-14T23:02:32.515Z" cannot be set unless qty.												from or qty.to is set; Qty To null must be 1 or 											more"


Current Situation:
4/24/17
Working on getting the code to run as one encapsulated chunk without me having to write anything in. Can basically do that with shipments and inventory right now. Will need expand this to include the users/accounts/drugs testing. Once it can run through like this and all the expectations are lined up and it doesn't fail on timing anywhere, then I want to expand robustness of certain transaction related tasks. Then can begin integrating into the development repo and considering chunking of any sort.

4/26/17
Ironing out the kinks in running the whole suite of tests. It's all incorporated in the development repo in my fork, and my fork of client has all the markups. At this point I need to get it to be able to run start-finish and then I can submit pull requests for all this. Then it will be a question of expanding this testing to the point that I feel comfortable calling the site tested based SOLELY on these suites.
Runtime: 15 minutes

Step Log:
- Keep the Drugs page commented out - CANT
- Delete all the other databases and try running all the other tests together
- NEED to delete all the databases on a fresh run, can't keep the drugs in there.
- NEED to fix the drug code to at least be able to just add drugs so we can test everything else in a god
- Get it all running in one clean go
- Not quite there on all running together easily, but is up to date with the client repo and can be submitted as a pull request with markups
- CHANGE ALL THE ATTEMPTS to click new shipment just to get rid of drawer to tell the browser to just click on the different page buttons
- May be a new bug added to the checkbox functionality at this point, need to investigate further, otherwise the code should work for login/join except for last test of it all
- Should have all the essential markups in Drugs done, so can comit to Adam
- Sometimes login button is funky? --> Added lag between entering values and seeing results
- Before moving over to the dscsa/development repo, add commented out lines to each segment, with the necessary code to start from that bit alone, so we can easily in-code decide which chunks of code to run. Can be cleaner in the future
- Incorporated into the development repo, and all the changes to client are pushed. Once the test is all ironed out, I will submit pull requests

TODO for V2 Of E2E:
- Build in a way for each chunk testing (login/join/shipments/inventory) to start from scratch by closing the window and reopening one, that way if one hits a terminal failure it doesn't kill the entire thing.
- Fine tune the timing and see where sleep is necessary, where it's not, and if there's less fragile ways to build this out.
     - Make it faster overall
- Edit the Join function to be more efficient
- Expand the amount and use of helper functions to simplify the code
- Clean up comments and code quality
