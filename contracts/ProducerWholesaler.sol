// SPDX-License-Identifier: MIT
pragma solidity ^0.8.36;

import {MarketplaceBase} from "./MarketplaceBase.sol";

contract ProducerWholesaler is MarketplaceBase {
    address public immutable producer;

    event ProductSold(
        uint256 indexed productId,
        address indexed producer,
        address indexed wholesaler,
        uint256 quantity,
        uint256 totalPrice,
        uint256 dividendFee,
        address dividendPool
    );

    constructor(address payable _dividendPool) MarketplaceBase(_dividendPool) {
        producer = msg.sender;
    }

    function setWholesalePrice(
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
            producer,
            msg.sender,
            _quantity,
            totalPrice,
            dividendFee,
            dividendPool
        );
    }

    function _seller() internal view override returns (address) {
        return producer;
    }

    function _requireSeller() internal view override {
        require(
            msg.sender == producer,
            "Only producer can perform this action"
        );
    }

    function _requireValidBuyer() internal view override {
        require(msg.sender != producer, "Producer cannot buy own product");
    }

    function _revertSellerPaymentFailed() internal pure override {
        revert("Producer payment failed");
    }
}