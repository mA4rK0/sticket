// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract EventTickets is ERC721 {
    uint256 public officialPrice;
    address public organizer;
    uint256 public immutable maxSupply;
    uint256 public immutable eventStart;
    uint256 public nextTicketId = 1;
    mapping(uint256 => uint256) public checkedInAt;

    struct Listing {
        address seller;
        uint256 price;
    }

    uint256 public constant FEE_BPS = 500; // 5%
    mapping(uint256 => Listing) public listings;

    error TransferNotAllowed();

    constructor(uint256 _officialPrice, address _organizer, uint256 _maxSupply, uint256 _eventStart)
        ERC721("Sticket", "STK")
    {
        require(_officialPrice > 0, "Price required");
        require(_organizer != address(0), "Organizer required");
        require(_maxSupply > 0, "Max supply required");
        require(_eventStart > 0, "Event start required");
        officialPrice = _officialPrice;
        organizer = _organizer;
        maxSupply = _maxSupply;
        eventStart = _eventStart;
    }

    function buy() external payable {
        require(block.timestamp < eventStart, "Sales closed");
        require(msg.value == officialPrice, "Incorrect payment amount");
        require(nextTicketId <= maxSupply, "Sold out");

        _mint(msg.sender, nextTicketId);
        nextTicketId++;
    }

    function listForSale(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(!isUsed(tokenId), "Ticket used");
        require(price > 0, "Price required");
        require(price <= officialPrice, "Above cap");

        listings[tokenId] = Listing(msg.sender, price);
        _update(address(this), tokenId, address(0));
    }

    function unlist(uint256 tokenId) external {
        require(listings[tokenId].seller == msg.sender, "Not seller");

        delete listings[tokenId];
        _update(msg.sender, tokenId, address(0));
    }

    function buyResale(uint256 tokenId) external payable {
        require(block.timestamp < eventStart, "Sales closed");

        Listing memory listing = listings[tokenId];

        require(listing.seller != address(0), "Not listed");
        require(msg.value == listing.price, "Incorrect payment amount");
        require(listing.price <= officialPrice, "Above cap");
        require(!isUsed(tokenId), "Ticket used");

        delete listings[tokenId];

        _update(msg.sender, tokenId, address(0));

        uint256 fee = (listing.price * FEE_BPS) / 10_000;
        (bool ok,) = listing.seller.call{value: listing.price - fee}("");
        require(ok, "Payout failed");
    }

    function withdraw() external {
        require(msg.sender == organizer, "Only organizer");
        require(block.timestamp >= eventStart, "Event not started");

        (bool ok,) = organizer.call{value: address(this).balance}("");
        require(ok, "Withdraw failed");
    }

    function isUsed(uint256 tokenId) public view returns (bool) {
        return checkedInAt[tokenId] != 0;
    }

    function checkIn(uint256 tokenId) external {
        require(msg.sender == organizer, "Only organizer");
        require(block.timestamp >= eventStart, "Event not started");
        require(ownerOf(tokenId) != address(this), "Ticket escrowed");
        require(!isUsed(tokenId), "Already checked in");

        checkedInAt[tokenId] = block.timestamp;
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        if (auth != address(0)) revert TransferNotAllowed();
        return super._update(to, tokenId, auth);
    }
}
