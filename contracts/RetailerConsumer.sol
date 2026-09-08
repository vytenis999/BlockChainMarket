// SPDX-License-Identifier: MIT
pragma solidity ^0.8.36;

import {MarketplaceBase} from "./MarketplaceBase.sol";

contract RetailerConsumer is MarketplaceBase {
    address public immutable retailer;

    event ProductSold(
        uint256 indexed productId,
        address indexed retailer,
        address indexed consumer,
        uint256 quantity,
        uint256 totalPrice,
        uint256 dividendFee,
        address dividendPool
    );

    constructor(address payable _dividendPool) MarketplaceBase(_dividendPool) {
        retailer = msg.sender;
    }

    function setProductPrice(
        uint256 _productId,
        uint256 _newPriceWei
    ) external {
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
            retailer,
            msg.sender,
            _quantity,
            totalPrice,
            dividendFee,
            dividendPool
        );
    }

    function _seller() internal view override returns (address) {
        return retailer;
    }

    function _requireSeller() internal view override {
        require(
            msg.sender == retailer,
            "Only retailer can perform this action"
        );
    }

    function _requireValidBuyer() internal view override {
        require(msg.sender != retailer, "Retailer cannot buy own product");
    }

    function _revertSellerPaymentFailed() internal pure override {
        revert("Retailer payment failed");
    }
}