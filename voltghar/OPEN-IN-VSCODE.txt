# VoltGhar
Install Node.js 24, extract the project and run START-WINDOWS.cmd. Open http://localhost:5173. On other platforms copy .env.example to .env, run npm ci and npm run dev.

The application starts with an empty SQLite database. Create a driver or host account in the website. Hosts submit their own address, connector, coordinates, daily hours and price. Administrators approve submissions before they appear in search. Hosts can pause listings. Drivers add a compatible vehicle, reserve a time, and receive private arrival instructions and a code. At arrival the host enters that code and the opening charger meter reading. At departure the host enters the closing reading. Both accounts can see the recorded cost. Payment is arranged separately. Live updates use server-sent events.

## Provision the first administrator
Open PowerShell in the project directory after installing dependencies. Run these commands with your own account details:
~~~
$env:ADMIN_EMAIL = Read-Host 'Admin email'
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('',(Read-Host 'Admin password (14+ characters)' -AsSecureString)).Password
npm.cmd run admin:create
Remove-Item Env:ADMIN_PASSWORD
~~~
Use an email that has not already been registered. Sign in through the normal website. Review host details before approving a listing.

## Self hosting
Use Node 24 and a persistent disk for DATABASE_PATH. Set APP_ORIGIN to your exact HTTPS origin, run npm ci and npm run build, and start the production server using npm start on Linux or the included Dockerfile. Forward traffic to port 3001. Support unbuffered SSE responses at /api/updates. Use one application instance with this SQLite configuration. Back up the database. Keep real account data out of source control. When upgrading from the former sample build, choose a new DATABASE_PATH; keep the previous database separately if it contains records you need.
