// SPDX-License-Identifier: MIT
pragma solidity ^0.8.36;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

contract KTUToken is ERC20, ERC20Burnable, ERC20Permit, ERC20Votes {
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10 ** 18;

    mapping(address => bool) private isKnownHolder;
    address[] private holders;

    constructor() ERC20("KTUToken", "KTU") ERC20Permit("KTUToken") {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    function holderCount() external view returns (uint256) {
        return holders.length;
    }

    function holderAt(uint256 _index) external view returns (address) {
        require(_index < holders.length, "Holder does not exist");

        return holders[_index];
    }

    function delegate(address _delegatee) public override {
        require(_delegatee == msg.sender, "KTU only supports self-delegation");

        super.delegate(_delegatee);
    }

    function delegateBySig(
        address,
        uint256,
        uint256,
        uint8,
        bytes32,
        bytes32
    ) public pure override {
        revert("KTU delegation by signature is disabled");
    }

    function _update(
        address _from,
        address _to,
        uint256 _value
    ) internal override(ERC20, ERC20Votes) {
        if (_to != address(0) && delegates(_to) == address(0)) {
            _delegate(_to, _to);
        }

        if (_to != address(0) && !isKnownHolder[_to]) {
            isKnownHolder[_to] = true;
            holders.push(_to);
        }

        super._update(_from, _to, _value);
    }

    function nonces(
        address _owner
    ) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(_owner);
    }
}
