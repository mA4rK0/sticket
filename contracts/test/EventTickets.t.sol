// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "src/EventTickets.sol";

contract EventTicketsTest is Test {
  EventTickets tickets;

  address organizer = address(0xBEEF);
  address alice   = address(0xA11CE);
  address bob     = address(0xB0B);
  address carol   = address(0xCAA0);

  uint256 constant PRICE = 1 ether;
  uint256 constant SUPPLY = 100;
  uint256 constant EVENT_START = 1_700_000_000;

  function setUp() public {
    vm.warp(EVENT_START - 1);
    tickets = new EventTickets(PRICE, organizer, SUPPLY, EVENT_START);

    vm.deal(alice, 100 ether);
    vm.deal(bob,   100 ether);
    vm.deal(carol, 100 ether);
  }

  function test_AliceBuysFirstTicket() public {
    uint256 balBefore = alice.balance;

    vm.prank(alice);
    tickets.buy{value: PRICE}();

    assertEq(tickets.ownerOf(1), alice);
    assertEq(alice.balance, balBefore - PRICE);
    assertEq(tickets.nextTicketId(), 2);
  }

  function test_SecondBuyerGetsTokenTwo() public {
    vm.prank(alice);
    tickets.buy{value: PRICE}();

    vm.prank(bob);
    tickets.buy{value: PRICE}();

    assertEq(tickets.ownerOf(1), alice);
    assertEq(tickets.ownerOf(2), bob);
    assertEq(tickets.nextTicketId(), 3);
  }

  function test_RevertWhen_TooLittlePaid() public {
    vm.prank(alice);
    vm.expectRevert("Incorrect payment amount");
    tickets.buy{value: PRICE - 1}();
  }

  function test_RevertWhen_TooMuchPaid() public {
    vm.prank(alice);
    vm.expectRevert("Incorrect payment amount");
    tickets.buy{value: PRICE + 1}();
  }

  function test_ConstructorSetsState() public {
    assertEq(tickets.officialPrice(), PRICE);
    assertEq(tickets.organizer(), organizer);
    assertEq(tickets.maxSupply(), SUPPLY);
    assertEq(tickets.eventStart(), EVENT_START);
    assertEq(tickets.nextTicketId(), 1);
  }

  function test_RevertWhen_NoEther() public {
    address broke = address(0xDEAD); 

    vm.prank(broke);
    vm.expectRevert("Incorrect payment amount");
    tickets.buy{value: 0}();
  }

  function test_RevertWhen_UserTransfersTicket() public {
    vm.prank(alice);
    tickets.buy{value: PRICE}();

    vm.prank(alice);
    vm.expectRevert(EventTickets.TransferNotAllowed.selector);
    tickets.transferFrom(alice, bob, 1);

    assertEq(tickets.ownerOf(1), alice);
  }

  function test_Withdraw_SendsBalanceToOrganizer() public {
    vm.prank(alice);
    tickets.buy{value: PRICE}();

    assertEq(address(tickets).balance, PRICE);

    uint256 organizerBalBefore = organizer.balance;

    vm.warp(EVENT_START);
    vm.prank(organizer);
    tickets.withdraw();

    assertEq(organizer.balance, organizerBalBefore + PRICE);
    assertEq(address(tickets).balance, 0);
  }

  function test_RevertWhen_WithdrawByNonOrganizer() public {
    vm.prank(alice);
    tickets.buy{value: PRICE}();

    vm.prank(alice);
    vm.expectRevert("Only organizer");
    tickets.withdraw();

    assertEq(address(tickets).balance, PRICE);
  }

  function test_RevertWhen_OrganizerIsZeroAddress() public {
    vm.expectRevert("Organizer required");
    new EventTickets(PRICE, address(0), SUPPLY, EVENT_START);
  }

  function test_SoldOutBoundary_LastTicketSells() public {
    EventTickets small = new EventTickets(PRICE, organizer, 2, EVENT_START);

    vm.prank(alice);
    small.buy{value: PRICE}();
    vm.prank(bob);
    small.buy{value: PRICE}();

    assertEq(small.ownerOf(2), bob);
    assertEq(small.nextTicketId(), 3);

    vm.prank(alice);
    vm.expectRevert("Sold out");
    small.buy{value: PRICE}();
  }

  function test_RevertWhen_MaxSupplyIsZero() public {
    vm.expectRevert("Max supply required");
    new EventTickets(PRICE, organizer, 0, EVENT_START);
  }

  function test_RevertWhen_OfficialPriceIsZero() public {
    vm.expectRevert("Price required");
    new EventTickets(0, organizer, SUPPLY, EVENT_START);
  }

  function test_CheckIn_MarksUsedWithTimestamp() public {
    vm.prank(alice);
    tickets.buy{value: PRICE}();

    assertFalse(tickets.isUsed(1));

    vm.warp(1_700_000_000);
    vm.prank(organizer);
    tickets.checkIn(1);

    assertTrue(tickets.isUsed(1));
    assertEq(tickets.checkedInAt(1), 1_700_000_000);
  }

  function test_RevertWhen_DoubleCheckIn() public {
    vm.prank(alice);
    tickets.buy{value: PRICE}();

    vm.warp(EVENT_START);
    vm.prank(organizer);
    tickets.checkIn(1);

    vm.prank(organizer);
    vm.expectRevert("Already checked in");
    tickets.checkIn(1);
  }

  function test_RevertWhen_CheckInByNonOrganizer() public {
    vm.prank(alice);
    tickets.buy{value: PRICE}();

    vm.prank(alice);
    vm.expectRevert("Only organizer");
    tickets.checkIn(1);

    assertFalse(tickets.isUsed(1));
  }

  function test_RevertWhen_CheckInUnknownTicket() public {
    vm.warp(EVENT_START);
    vm.prank(organizer);
    vm.expectRevert();
    tickets.checkIn(999);
  }

  function test_ListForSale_EscrowsTicket() public {
    vm.prank(alice);
    tickets.buy{value: PRICE}();

    vm.prank(alice);
    tickets.listForSale(1, PRICE);

    assertEq(tickets.ownerOf(1), address(tickets));
    assertEq(tickets.balanceOf(alice), 0);

    (address seller, uint256 price) = tickets.listings(1);
    assertEq(seller, alice);
    assertEq(price, PRICE);
  }

  function test_RevertWhen_ListByNonOwner() public {
    vm.prank(alice);
    tickets.buy{value: PRICE}();

    vm.prank(bob);
    vm.expectRevert("Not owner");
    tickets.listForSale(1, PRICE);
  }

  function test_RevertWhen_ListAboveCap() public {
    vm.prank(alice);
    tickets.buy{value: PRICE}();

    vm.prank(alice);
    vm.expectRevert("Above cap");
    tickets.listForSale(1, PRICE + 1);
  }

  function test_RevertWhen_ListPriceZero() public {
    vm.prank(alice);
    tickets.buy{value: PRICE}();

    vm.prank(alice);
    vm.expectRevert("Price required");
    tickets.listForSale(1, 0);
  }

  function test_RevertWhen_ListUsedTicket() public {
    vm.prank(alice);
    tickets.buy{value: PRICE}();

    vm.warp(EVENT_START);
    vm.prank(organizer);
    tickets.checkIn(1);

    vm.prank(alice);
    vm.expectRevert("Ticket used");
    tickets.listForSale(1, PRICE);
  }

  function test_RevertWhen_ListTwice() public {
    vm.prank(alice);
    tickets.buy{value: PRICE}();

    vm.prank(alice);
    tickets.listForSale(1, PRICE);

    vm.prank(alice);
    vm.expectRevert("Not owner");
    tickets.listForSale(1, PRICE);
  }

  function test_Unlist_ReturnsTicketToSeller() public {
    vm.prank(alice);
    tickets.buy{value: PRICE}();

    vm.prank(alice);
    tickets.listForSale(1, PRICE);

    vm.prank(alice);
    tickets.unlist(1);

    assertEq(tickets.ownerOf(1), alice);

    (address seller, ) = tickets.listings(1);
    assertEq(seller, address(0));
  }

  function test_RevertWhen_UnlistByNonSeller() public {
    vm.prank(alice);
    tickets.buy{value: PRICE}();

    vm.prank(alice);
    tickets.listForSale(1, PRICE);

    vm.prank(bob);
    vm.expectRevert("Not seller");
    tickets.unlist(1);
  }

  function test_BuyResale_TransfersTicketAndPaysSeller() public {
    vm.prank(alice);
    tickets.buy{value: PRICE}();

    vm.prank(alice);
    tickets.listForSale(1, PRICE);

    uint256 sellerBalBefore = alice.balance;
    uint256 fee = (PRICE * 500) / 10_000;

    vm.prank(bob);
    tickets.buyResale{value: PRICE}(1);

    assertEq(tickets.ownerOf(1), bob);
    assertEq(alice.balance, sellerBalBefore + PRICE - fee);
    assertEq(address(tickets).balance, PRICE + fee);

    (address seller, ) = tickets.listings(1);
    assertEq(seller, address(0));
  }

  function test_RevertWhen_BuyResaleWithoutListing() public {
    vm.prank(alice);
    tickets.buy{value: PRICE}();

    vm.prank(bob);
    vm.expectRevert("Not listed");
    tickets.buyResale{value: PRICE}(1);
  }

  function test_RevertWhen_BuyResaleWrongPayment() public {
    vm.prank(alice);
    tickets.buy{value: PRICE}();

    vm.prank(alice);
    tickets.listForSale(1, PRICE);

    vm.prank(bob);
    vm.expectRevert("Incorrect payment amount");
    tickets.buyResale{value: PRICE - 1}(1);

    vm.prank(bob);
    vm.expectRevert("Incorrect payment amount");
    tickets.buyResale{value: PRICE + 1}(1);
  }

  function test_RevertWhen_CheckInEscrowedTicket() public {
    vm.prank(alice);
    tickets.buy{value: PRICE}();

    vm.prank(alice);
    tickets.listForSale(1, PRICE);

    vm.warp(EVENT_START);
    vm.prank(organizer);
    vm.expectRevert("Ticket escrowed");
    tickets.checkIn(1);
  }

  function test_UnlistThenBuyResale_Reverts() public {
    vm.prank(alice);
    tickets.buy{value: PRICE}();

    vm.prank(alice);
    tickets.listForSale(1, PRICE);

    vm.prank(alice);
    tickets.unlist(1);

    vm.prank(bob);
    vm.expectRevert("Not listed");
    tickets.buyResale{value: PRICE}(1);

    assertEq(tickets.ownerOf(1), alice);
  }

  function test_RevertWhen_WithdrawBeforeEventStart() public {
    vm.prank(alice);
    tickets.buy{value: PRICE}();

    vm.warp(EVENT_START - 1);

    vm.prank(organizer);
    vm.expectRevert("Event not started");
    tickets.withdraw();

    assertEq(address(tickets).balance, PRICE);
  }

  function test_Withdraw_AtEventStartSucceeds() public {
    vm.prank(alice);
    tickets.buy{value: PRICE}();

    uint256 organizerBalBefore = organizer.balance;

    vm.warp(EVENT_START);
    vm.prank(organizer);
    tickets.withdraw();

    assertEq(organizer.balance, organizerBalBefore + PRICE);
    assertEq(address(tickets).balance, 0);
  }

  function test_RevertWhen_CheckInBeforeEventStart() public {
    vm.prank(alice);
    tickets.buy{value: PRICE}();

    vm.warp(EVENT_START - 1);

    vm.prank(organizer);
    vm.expectRevert("Event not started");
    tickets.checkIn(1);

    assertFalse(tickets.isUsed(1));
  }

  function test_RevertWhen_EventStartIsZero() public {
    vm.expectRevert("Event start required");
    new EventTickets(PRICE, organizer, SUPPLY, 0);
  }

  function test_Buy_LastMomentBeforeSalesClose() public {
    vm.warp(EVENT_START - 1);

    vm.prank(alice);
    tickets.buy{value: PRICE}();

    assertEq(tickets.ownerOf(1), alice);
  }

  function test_RevertWhen_BuyAfterSalesClosed() public {
    vm.warp(EVENT_START);

    vm.prank(alice);
    vm.expectRevert("Sales closed");
    tickets.buy{value: PRICE}();

    assertEq(tickets.nextTicketId(), 1);
    assertEq(address(tickets).balance, 0);
  }

  function test_RevertWhen_BuyResaleAfterSalesClosed() public {
    vm.prank(alice);
    tickets.buy{value: PRICE}();

    vm.prank(alice);
    tickets.listForSale(1, PRICE);

    vm.warp(EVENT_START);

    vm.prank(bob);
    vm.expectRevert("Sales closed");
    tickets.buyResale{value: PRICE}(1);

    assertEq(tickets.ownerOf(1), address(tickets));

    (address seller, ) = tickets.listings(1);
    assertEq(seller, alice);
  }

  function test_SecondHandResale_CapDoesNotDrop() public {
    uint256 cheap = PRICE / 2;

    vm.prank(alice);
    tickets.buy{value: PRICE}();

    vm.prank(alice);
    tickets.listForSale(1, cheap);

    vm.prank(bob);
    tickets.buyResale{value: cheap}(1);

    assertEq(tickets.ownerOf(1), bob);

    vm.prank(bob);
    tickets.listForSale(1, PRICE);

    (address seller, uint256 price) = tickets.listings(1);
    assertEq(seller, bob);
    assertEq(price, PRICE);
  }

  function test_SecondHandResale_AllowsArbitrage() public {
    uint256 cheap = PRICE / 2;
    uint256 fee = (PRICE * 500) / 10_000;
    uint256 cheapFee = (cheap * 500) / 10_000;

    vm.prank(alice);
    tickets.buy{value: PRICE}();

    vm.prank(alice);
    tickets.listForSale(1, cheap);

    vm.prank(bob);
    tickets.buyResale{value: cheap}(1);

    uint256 bobBalAfterBuy = bob.balance;
    assertEq(bobBalAfterBuy, 100 ether - cheap);

    vm.prank(bob);
    tickets.listForSale(1, PRICE);

    vm.prank(carol);
    tickets.buyResale{value: PRICE}(1);

    assertEq(tickets.ownerOf(1), carol);
    assertEq(bob.balance, bobBalAfterBuy + PRICE - fee);
    assertGt(bob.balance, 100 ether);
    assertEq(alice.balance, 100 ether - PRICE + cheap - cheapFee);
  }
}
