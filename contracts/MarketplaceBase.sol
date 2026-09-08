// SPDX-License-Identifier: MIT
pragma solidity ^0.8.36;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

abstract contract MarketplaceBase is ReentrancyGuard {
    uint256 public constant DIVIDEND_FEE_PERCENT = 5;

    address payable public immutable dividendPool;

    struct Listing {
        uint256 unitPriceWei;
        uint256 availableQuantity;
        bool active;
    }

    mapping(uint256 => Listing) public listings;

    event ProductListed(
        uint256 indexed productId,
        uint256 availableQuantity,
        uint256 unitPriceWei
    );

    constructor(address payable _dividendPool) {
        require(_dividendPool != address(0), "Invalid dividend pool address");

        dividendPool = _dividendPool;
    }

    function listProduct(
        uint256 _productId,
        uint256 _quantity,
        uint256 _unitPriceWei
    ) external {
        _requireSeller();

        require(_quantity > 0, "Quantity must be greater than zero");
        require(_unitPriceWei > 0, "Price must be greater than zero");

        listings[_productId] = Listing({
            unitPriceWei: _unitPriceWei,
            availableQuantity: _quantity,
            active: true
        });

        emit ProductListed(_productId, _quantity, _unitPriceWei);
    }

    function calculatePayment(
        uint256 _productId,
        uint256 _quantity
    )
        external
        view
        returns (
            uint256 productPrice,
            uint256 dividendFee,
            uint256 totalPayment
        )
    {
        Listing memory listing = listings[_productId];

        require(listing.active, "Product is not listed");

        return _calculatePayment(listing.unitPriceWei, _quantity);
    }

    function getListing(
        uint256 _productId
    )
        external
        view
        returns (uint256 unitPriceWei, uint256 availableQuantity, bool active)
    {
        Listing memory listing = listings[_productId];

        return (
            listing.unitPriceWei,
            listing.availableQuantity,
            listing.active
        );
    }

    function _setUnitPrice(uint256 _productId, uint256 _newPriceWei) internal {
        _requireSeller();

        require(listings[_productId].active, "Product is not listed");
        require(_newPriceWei > 0, "Price must be greater than zero");

        listings[_productId].unitPriceWei = _newPriceWei;
    }

    function _buyProduct(
        uint256 _productId,
        uint256 _quantity
    ) internal nonReentrant returns (uint256 totalPrice, uint256 dividendFee) {
        Listing storage listing = listings[_productId];

        require(listing.active, "Product is not for sale");
        _requireValidBuyer();
        require(_quantity > 0, "Quantity must be greater than zero");
        require(
            listing.availableQuantity >= _quantity,
            "Not enough listed quantity"
        );

        uint256 totalPayment;
        (totalPrice, dividendFee, totalPayment) = _calculatePayment(
            listing.unitPriceWei,
            _quantity
        );

        require(msg.value == totalPayment, "Incorrect ETH payment");

        listing.availableQuantity -= _quantity;

        if (listing.availableQuantity == 0) {
            listing.active = false;
        }

        (bool sellerPaid, ) = payable(_seller()).call{value: totalPrice}("");

        if (!sellerPaid) {
            _revertSellerPaymentFailed();
        }

        (bool feePaid, ) = dividendPool.call{value: dividendFee}("");
        require(feePaid, "Dividend fee payment failed");
    }

    function _calculatePayment(
        uint256 _unitPriceWei,
        uint256 _quantity
    )
        private
        pure
        returns (
            uint256 productPrice,
            uint256 dividendFee,
            uint256 totalPayment
        )
    {
        productPrice = _unitPriceWei * _quantity;
        dividendFee = (productPrice * DIVIDEND_FEE_PERCENT) / 100;
        totalPayment = productPrice + dividendFee;
    }

    function _seller() internal view virtual returns (address);

    function _requireSeller() internal view virtual;

    function _requireValidBuyer() internal view virtual;

    function _revertSellerPaymentFailed() internal pure virtual;
}