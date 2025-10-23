Route planser:
In Star citizen player has contracts to locations to pickup and dropoff cargo. 
We want to build a route planner that will plan a route for the player to complete the contracts.

Input:
Strarting location: start location, user start location. auto fill from @AllEntities. Only once on top
Cargo Space: available cargo space, user input. Only once on top.

User can add stations to routes. Auto fill from contract locations.
User can remove stations from routes. drag and drop to change order.

We will handle the inventory so that user can plan a route to pickup and dropff all cargo at correct locations.

Logic:
StationInventoryManager:
- initialize from contracts.
- will handle the inventory of the station.
- will handle the pickup and dropoff of the cargo.
- React context/state.

ShipInventoryManager:
- will handle the inventory of the ship.
- will handle the pickup and dropoff of the cargo.
- React context/state.

Structure of each station. 
Route Stop: Everus Harbor
SCU: 0/100

📦 Pickup:
  ☑ Medical Supplies (50 SCU)
  ☐ Food Supplies (30 SCU)

🚚 Dropoff:
  (shows if any dropoffs)

📋 Inventory After:
  Medical Supplies: 50 SCU

In each station user can select what to pickup. 
Dropoff is automatically handled by the system, based on ships inventory.
We should only dropoff based on what is required in the station in all contracts.