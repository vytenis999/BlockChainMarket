// SPDX-License-Identifier: MIT
pragma solidity ^0.8.36;

import {MarketplaceBase} from "./MarketplaceBase.sol";

contract WholesalerRetailer is MarketplaceBase {
    address public immutable wholesaler;

    event ProductSold(
        uint256 indexed productId,
        address indexed wholesaler,
        address indexed retailer,
        uint256 quantity,
        uint256 totalPrice,
        uint256 dividendFee,
        address dividendPool
    );

    constructor(address payable _dividendPool) MarketplaceBase(_dividendPool) {
        wholesaler = msg.sender;
    }

    function setRetailPrice(uint256 _productId, uint256 _newPriceWei) external {
        _setUnitPrice(_productId, _newPriceWei);
    }

    function buyProduct(
        uint256 _productId,
        uint256 _quantity
    ) external payable {
        (uint256 totalPrice, uint256 dividendFee) = _buyProduct(
            _productId,
            _quantity
        );

        emit ProductSold(
            _productId,
            wholesaler,
            msg.sender,
            _quantity,
            totalPrice,
            dividendFee,
            dividendPool
        );
    }

    function _seller() internal view override returns (address) {
        return wholesaler;
    }

    function _requireSeller() internal view override {
        require(
            msg.sender == wholesaler,
            "Only wholesaler can perform this action"
        );
    }

    function _requireValidBuyer() internal view override {
        require(msg.sender != wholesaler, "Wholesaler cannot buy own product");
    }

    function _revertSellerPaymentFailed() internal pure override {
        revert("Wholesaler payment failed");
    }
}