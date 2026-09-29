// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {EventTickets} from "src/EventTickets.sol";

/// @notice Deploys one EventTickets contract for one event.
/// @dev Configuration comes from the environment so the same script works against
///      any chain without editing code. Required variables:
///        TICKET_PRICE  — official price in wei
///        ORGANIZER     — address that may check tickets in and withdraw proceeds
///        MAX_SUPPLY    — maximum number of tickets
///        EVENT_START   — unix timestamp; sales close and the door opens at this instant
contract Deploy is Script {
    function run() external returns (EventTickets tickets) {
        uint256 price = vm.envUint("TICKET_PRICE");
        address organizer = vm.envAddress("ORGANIZER");
        uint256 maxSupply = vm.envUint("MAX_SUPPLY");
        uint256 eventStart = vm.envUint("EVENT_START");

        vm.startBroadcast();
        tickets = new EventTickets(price, organizer, maxSupply, eventStart);
        vm.stopBroadcast();

        console.log("EventTickets deployed at:", address(tickets));
        console.log("organizer:", organizer);
        console.log("maxSupply:", maxSupply);
        console.log("eventStart:", eventStart);
    }
}
