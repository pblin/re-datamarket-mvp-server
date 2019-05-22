pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../../node_modules/openzeppelin-solidity/contracts/token/ERC721/ERC721Metadata.sol";
import "../../node_modules/openzeppelin-solidity/contracts/token/ERC721/IERC721Enumerable.sol";
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/**
* @title Rebloc Dataset 
*
* http://www.rebloc.io/
*
* ERC721 compliant dataset token
*
*/

contract ReblocDatasetToken is ERC721Metadata("ReblocDatasetToken", "RDT"), IERC721Enumerable {
    using SafeMath for uint256;
        // Mapping from owner to list of owned token IDs
    mapping(address => uint256[]) private _ownedTokens;

    // Mapping from token ID to index of the owner tokens list
    mapping(uint256 => uint256) private _ownedTokensIndex;

    // Array with all token ids, used for enumeration
    uint256[] private _allTokens;

    // Mapping from token id to position in the allTokens array
    mapping(uint256 => uint256) private _allTokensIndex;

    /*
     *     bytes4(keccak256('totalSupply()')) == 0x18160ddd
     *     bytes4(keccak256('tokenOfOwnerByIndex(address,uint256)')) == 0x2f745c59
     *     bytes4(keccak256('tokenByIndex(uint256)')) == 0x4f6ccce7
     *
     *     => 0x18160ddd ^ 0x2f745c59 ^ 0x4f6ccce7 == 0x780e9d63
     */
    bytes4 private constant INTERFACE_ID_ERC721_ENUMERABLE = 0x780e9d63;

    address private operatorAccount;

    struct Dataset {
        bytes id;
        uint32 size;
        string fileHash;
        string ipfsHash;
        string compression;
        uint256 price;
        string pricingUnit;
        uint256 commission;
        address curator;
    }

    struct Validator {
        address validatorAddress;
        uint256 commission; 
    }
    
    // A pointer to the next token to be minted, zero indexed
    uint256 public tokenIdPointer = 0;

    enum PurchaseState {Unsold, EtherPurchase, FiatPurchase}
    mapping(uint256 => PurchaseState) internal tokenIdToPurchased;
    mapping(uint256 => uint32) internal tokenIdToPurchaseFromTime;
    mapping(uint256 => Dataset) internal datasetInfo;
    mapping(uint256 => Validator[]) internal validator;

    event PurchasedWithEther(uint256 indexed _tokenId, address indexed _buyer);
    event PurchasedWithFiat(uint256 indexed _tokenId);
    event PurchasedWithFiatReversed(uint256 indexed _tokenId);
    event Approval (address indexed _address, uint256 indexed _tokenId);

    modifier onlyOwnedToken(uint256 _tokenId) {
        require(super.ownerOf(_tokenId) == msg.sender);
        _;
    }

    modifier onlyUnsold(uint256 _tokenId) {
        require(tokenIdToPurchased[_tokenId] == PurchaseState.Unsold);
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operatorAccount);
        _;
    }

    modifier onlyFiatPurchased(uint256 _tokenId) {
        require(tokenIdToPurchased[_tokenId] == PurchaseState.FiatPurchase);
        _;
    }

    modifier onlyAfterPurchaseFromTime(uint256 _tokenId) {
        require(tokenIdToPurchaseFromTime[_tokenId] <= block.timestamp);
        _;
    }

    // don't accept payment directly to contract
    function() external payable {
        revert();
    }

    /**
    * @dev Utility function for updating a RDT assets price
    * @dev Reverts if token is not unsold or not called by management
    * @param _tokenId the RDT token ID
    */
    function setPrice(uint _tokenId, uint256 _price, string memory _pricingUnit) public
                            onlyUnsold(_tokenId) 
                            onlyOwnedToken (_tokenId) 
        {
            require(_exists(_tokenId));
            datasetInfo[_tokenId].price = _price;
            datasetInfo[_tokenId].pricingUnit = _pricingUnit;
        }

    /**
     * @dev Gets the token ID at a given index of the tokens list of the requested owner.
     * @param owner address owning the tokens list to be accessed
     * @param index uint256 representing the index to be accessed of the requested tokens list
     * @return uint256 token ID at the given index of the tokens list owned by the requested address
     */
    function tokenOfOwnerByIndex(address owner, uint256 index) public view returns (uint256) {
        require(index < balanceOf(owner), "ERC721Enumerable: owner index out of bounds");
        return _ownedTokens[owner][index];
    }

    /**
     * @dev Gets the total amount of tokens stored by the contract.
     * @return uint256 representing the total amount of tokens
     */
    function totalSupply() public view returns (uint256) {
        return _allTokens.length;
    }

    /**
     * @dev Gets the token ID at a given index of all the tokens in this contract
     * Reverts if the index is greater or equal to the total number of tokens.
     * @param index uint256 representing the index to be accessed of the tokens list
     * @return uint256 token ID at the given index of the tokens list
     */
    function tokenByIndex(uint256 index) public view returns (uint256) {
        require(index < totalSupply(), "ERC721Enumerable: global index out of bounds");
        return _allTokens[index];
    }

    function constructuor (address _operatorAccount) public {
        if (_operatorAccount != address(0)) {
            operatorAccount = _operatorAccount;
        } else {
            operatorAccount = msg.sender;
        }
        _registerInterface(INTERFACE_ID_ERC721_ENUMERABLE);
    }

    /**
    * @dev Mint a new RDT token
    * @dev Reverts if not called by management
    * @param _id dataset id
    * @param _fileHash MD5 hash of compressed file
    * @param _compression compression algorithm gzip, ...
    * @param _ipfsHash IPFS file hash
    * @param _price settlement price
    * @param _pricingUnit usd, wei, eth, ...
    * @param _size file size 
    * @param _curator curator of the dataset
    */
    function mint(bytes memory _id, string memory _fileHash, string memory _compression, uint32 _size, string memory _ipfsHash, 
                    uint256 _price, string memory _pricingUnit, string memory _tokenURI, address _curator) public
        {
            uint256 _tokenId = tokenIdPointer;
            uint256 _initialCommission = 0;
            Dataset memory newDataset = Dataset({id: _id, fileHash: _fileHash, compression: _compression, ipfsHash: _ipfsHash, size: _size,
                                                price: _price, pricingUnit: _pricingUnit, commission: _initialCommission, curator: _curator});

            _mint(msg.sender, _tokenId);
            _ownedTokens[msg.sender].push(_tokenId);
            _populateTokenData(_tokenId, newDataset);

            super._setTokenURI(_tokenId, _tokenURI);
            tokenIdPointer = tokenIdPointer.add(1);
        }

    /**
    * @dev Burns a RDT token
    * @dev Reverts if token is not unsold or not owned by management
    * @param _tokenId the RDT token ID
    */
    function burn(uint256 _tokenId) public onlyUnsold(_tokenId) onlyOwnedToken(_tokenId) {
        require(_exists(_tokenId));
        super._burn(ownerOf(_tokenId), _tokenId);

        delete datasetInfo[_tokenId];
        delete tokenIdToPurchaseFromTime[_tokenId];
    }

  /**
    * @dev Retrieve all asset information for the provided token
    * @param _tokenId the RDT token ID
    * @return tokenId, owner, purchaseState, purchaseFromDateTime, pricingUnit
    */
    function getDatasetInfo(uint256 _tokenId) public view returns (
                    Dataset memory _dataset,
                    address _owner,
                    PurchaseState _purchaseState,
                    uint32 _purchaseFromTime)         
        {
            return 
                (
                    datasetInfo[_tokenId],
                    super.ownerOf(_tokenId),
                    tokenIdToPurchased[_tokenId],
                    tokenIdToPurchaseFromTime[_tokenId]
                );
        }

    function tokensOf(address _owner) public view returns (uint256[] memory _tokenIds) {
        return _ownedTokens[_owner];
    }

    /**
    * @dev Get the token purchase state for the given token
    * @param _tokenId the RDT token ID
    * @return the purchase sate, either 0, 1, 2, reverts if token not found
    */
    function isPurchased(uint256 _tokenId) public view returns (PurchaseState _purchased) {
        require(_exists(_tokenId));
        return tokenIdToPurchased[_tokenId];
    }

    /**
    * @dev Get the purchase from time for the given token
    * @param _tokenId the RDT token ID
    * @return the purchased from time, reverts if token not found
    */
    function purchaseFromTime(uint256 _tokenId) public view returns (uint32 _purchaseFromTime) {
        require(_exists(_tokenId));
        return tokenIdToPurchaseFromTime[_tokenId];
    }

    /**
    * @dev Purchase the provide token in Ether
    * @dev Reverts if token not unsold and not available to be purchased
    * msg.sender will become the owner of the token
    * msg.value needs to be >= to the token priceInWei
    * @param _tokenId the RDt token ID
    * @return true/false depending on success
    */
    function purchaseWithEther(uint256 _tokenId, uint256 _commission) public payable onlyUnsold(_tokenId) {
        require(_exists(_tokenId));
        require(stringsEqual(datasetInfo[_tokenId].pricingUnit, "wei"));
        require(msg.value >= datasetInfo[_tokenId].price);

        // approve sender as they have paid the required amount
        _approvePurchaser(msg.sender, _tokenId);

        // transfer assets from contract creator (curator) to new owner
        safeTransferFrom(ownerOf(_tokenId), msg.sender, _tokenId);

        // now purchased - don't allow re-purchase!
        tokenIdToPurchased[_tokenId] = PurchaseState.EtherPurchase;

        if (datasetInfo[_tokenId].price > 0) {
            _applyCommission(_tokenId, _commission);
        }

        emit PurchasedWithEther (_tokenId, msg.sender);
    }

    /**
    * @dev Purchase the provide token in FIAT, management command only for taking fiat payments 
    * during RDT physical exhibitions
    * Equivalent to taking the RDT token off the market and marking as sold
    * @dev Reverts if token not unsold and not available to be purchased and not called by management
    * @param _tokenId the RDT token ID
    */
    function purchaseWithFiat(uint256 _tokenId) public onlyUnsold(_tokenId) {
        require(_exists(_tokenId));
        // now purchased - don't allow re-purchase!
        emit PurchasedWithFiat(_tokenId);
    }


  /**
   * @dev Used to pre-approve a purchaser in order for internal purchase methods
   * to succeed without calling approve() directly
   * @param _tokenId the RDT token ID
   * @return address currently approved for a the given token ID
   */
  function _approvePurchaser(address _to, uint256 _tokenId) internal {
        address owner = super.ownerOf(_tokenId);
        require(_to != address(0));

        super.approve(_to, _tokenId);
        emit Approval(owner, _to, _tokenId);
    }

    function _populateTokenData(uint256 _tokenId, Dataset memory _dataset) internal {
        datasetInfo[_tokenId] = _dataset;
    }
    /**
     * @dev Internal function to transfer ownership of a given token ID to another address.
     * As opposed to transferFrom, this imposes no restrictions on msg.sender.
     * @param from current owner of the token
     * @param to address to receive the ownership of the given token ID
     * @param tokenId uint256 ID of the token to be transferred
     */

    function _transferFrom(address from, address to, uint256 tokenId) internal {
        super._transferFrom(from, to, tokenId);

        _removeTokenFromOwnerEnumeration(from, tokenId);
        _addTokenToOwnerEnumeration(to, tokenId);
    }

    /**
     * @dev Internal function to mint a new token.
     * Reverts if the given token ID already _exists.
     * @param to address the beneficiary that will own the minted token
     * @param tokenId uint256 ID of the token to be minted
     */
    function _mint(address to, uint256 tokenId) internal {
        super._mint(to, tokenId);

        _addTokenToOwnerEnumeration(to, tokenId);

        _addTokenToAllTokensEnumeration(tokenId);
    }

    /**
     * @dev Internal function to burn a specific token.
     * Reverts if the token does not exist.
     * Deprecated, use _burn(uint256) instead.
     * @param owner owner of the token to burn
     * @param tokenId uint256 ID of the token being burned
     */
    function _burn(address owner, uint256 tokenId) internal {
        super._burn(owner, tokenId);

        _removeTokenFromOwnerEnumeration(owner, tokenId);
        // Since tokenId will be deleted, we can clear its slot in _ownedTokensIndex to trigger a gas refund
        _ownedTokensIndex[tokenId] = 0;

        _removeTokenFromAllTokensEnumeration(tokenId);
    }

    /**
     * @dev Gets the list of token IDs of the requested owner.
     * @param owner address owning the tokens
     * @return uint256[] List of token IDs owned by the requested address
     */
    function _tokensOfOwner(address owner) internal view returns (uint256[] storage) {
        return _ownedTokens[owner];
    }

    /**
    * @dev Internal function for apply commission on purchase
    */
    function _applyCommission(uint256 _tokenId, uint256 _commission) internal {

        // pirce in cents for fiat in wei for crypto
        datasetInfo[_tokenId].commission = _commission;
    }

    /**
     * @dev Private function to add a token to this extension's ownership-tracking data structures.
     * @param to address representing the new owner of the given token ID
     * @param tokenId uint256 ID of the token to be added to the tokens list of the given address
     */
    function _addTokenToOwnerEnumeration(address to, uint256 tokenId) private {
        _ownedTokensIndex[tokenId] = _ownedTokens[to].length;
        _ownedTokens[to].push(tokenId);
    }

    /**
     * @dev Private function to add a token to this extension's token tracking data structures.
     * @param tokenId uint256 ID of the token to be added to the tokens list
     */
    function _addTokenToAllTokensEnumeration(uint256 tokenId) private {
        _allTokensIndex[tokenId] = _allTokens.length;
        _allTokens.push(tokenId);
    }

    /**
     * @dev Private function to remove a token from this extension's ownership-tracking data structures. Note that
     * while the token is not assigned a new owner, the _ownedTokensIndex mapping is _not_ updated: this allows for
     * gas optimizations e.g. when performing a transfer operation (avoiding double writes).
     * This has O(1) time complexity, but alters the order of the _ownedTokens array.
     * @param from address representing the previous owner of the given token ID
     * @param tokenId uint256 ID of the token to be removed from the tokens list of the given address
     */
    function _removeTokenFromOwnerEnumeration(address from, uint256 tokenId) private {
        // To prevent a gap in from's tokens array, we store the last token in the index of the token to delete, and
        // then delete the last slot (swap and pop).

        uint256 lastTokenIndex = _ownedTokens[from].length.sub(1);
        uint256 tokenIndex = _ownedTokensIndex[tokenId];

        // When the token to delete is the last token, the swap operation is unnecessary
        if (tokenIndex != lastTokenIndex) {
            uint256 lastTokenId = _ownedTokens[from][lastTokenIndex];

            _ownedTokens[from][tokenIndex] = lastTokenId; // Move the last token to the slot of the to-delete token
            _ownedTokensIndex[lastTokenId] = tokenIndex; // Update the moved token's index
        }

        // This also deletes the contents at the last position of the array
        _ownedTokens[from].length--;

        // Note that _ownedTokensIndex[tokenId] hasn't been cleared: it still points to the old slot (now occupied by
        // lastTokenId, or just over the end of the array if the token was the last one).
    }

    /**
     * @dev Private function to remove a token from this extension's token tracking data structures.
     * This has O(1) time complexity, but alters the order of the _allTokens array.
     * @param tokenId uint256 ID of the token to be removed from the tokens list
     */
    function _removeTokenFromAllTokensEnumeration(uint256 tokenId) private {
        // To prevent a gap in the tokens array, we store the last token in the index of the token to delete, and
        // then delete the last slot (swap and pop).

        uint256 lastTokenIndex = _allTokens.length.sub(1);
        uint256 tokenIndex = _allTokensIndex[tokenId];

        // When the token to delete is the last token, the swap operation is unnecessary. However, since this occurs so
        // rarely (when the last minted token is burnt) that we still do the swap here to avoid the gas cost of adding
        // an 'if' statement (like in _removeTokenFromOwnerEnumeration)
        uint256 lastTokenId = _allTokens[lastTokenIndex];

        _allTokens[tokenIndex] = lastTokenId; // Move the last token to the slot of the to-delete token
        _allTokensIndex[lastTokenId] = tokenIndex; // Update the moved token's index

        // This also deletes the contents at the last position of the array
        _allTokens.length--;
        _allTokensIndex[tokenId] = 0;
    }


    function stringsEqual(string storage _a, string memory _b) internal returns (bool) {
        bytes storage a = bytes(_a);
        bytes memory b = bytes(_b);

        if (a.length != b.length)
            return false;

        for (uint i = 0; i < a.length; i++)
            if (a[i] != b[i])
                    return false;

        return true;
    }
}