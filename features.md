An app to help organize and plan hauling missions in star citizen. 

# Features
- Record Hauling contracts
- Plan routes based on contracts
- Record and track cargo


## Record Hauling contracts
- Capture video of star citizen
- define zone in video to catpture
- when content changes in zone, capture screenshot
- OCR screenshot to extract info
- Save to database
- Add notes to the contract
- Add contract to route


## Pages

### record contract
- setup section (collapsible)
  - Allow user to select window to capture (add a option to stop it)
  - allow user to draw zone in the capture stream, store the zone info. 
    - reward zone
    - objective zone
  - generate a human readable ID that the user can share with others.
    - create a QR code that the user can share with others.
  - Have a option to enter ID and connect to remote record session.
    - allow user to scan QR code to connect to remote record session.
    - connect to remote session using PeerJS
- Record section
  - button to capture current screen
  - Extract text from Reward zone and Objective zone using Tesseract.js
  - show the extracted info in a table


## Plan routes
- TODO

## Record and track cargo
- TODO

## references
- https://ruadhan2301.github.io/SCHaulingManifest/
- https://jonathonhillnz.github.io/sc-cargo-manifest/
- https://sloshza.github.io/SC-Cargo-Tracker/