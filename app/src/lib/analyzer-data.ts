export type Severity = "high" | "medium" | "low";

export type ContractSummary = {
  description: string[];
  purpose: string;
  type: string;
  visibility: string;
  compiler: string;
  linesOfCode: number;
  estimatedGasAvg: string;
};

export type ContractDetails = {
  contractName: string;
  language: string;
  chain: string;
  license: string;
  optimization: string;
  evmVersion: string;
};

export type AttackScenario = {
  title: string;
  severity: Severity;
  description: string;
};

export type Improvement = {
  title: string;
  severity: Severity;
  reason: string;
  how: string;
};

export type ContractAnalysis = {
  address: string;
  fileName: string;
  language: string;
  chain: string;
  sourceCode: string;
  compileStatus: {
    solidityVersion: string;
    ok: boolean;
    gas: string;
    time: string;
  };
  summary: ContractSummary;
  keyFeatures: string[];
  details: ContractDetails;
  attacks: AttackScenario[];
  improvements: Improvement[];
};

const sampleVaultSource = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SampleVault {
    address public owner;
    mapping(address => uint256) public balances;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, 'Not owner');
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function deposit() external payable {
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 _amount) external {
        require(balances[msg.sender] >= _amount);
        balances[msg.sender] -= _amount;
        (bool sent, ) = msg.sender.call{value: _amount}('');
        require(sent, 'Transfer failed');
        emit Withdraw(msg.sender, _amount);
    }

    function getBalance(address _user)
        external view returns (uint256) {
        return balances[_user];
    }
}
`;

const sampleAnalysis: ContractAnalysis = {
  address: "sample",
  fileName: "Contract.sol",
  language: "Solidity",
  chain: "Ethereum",
  sourceCode: sampleVaultSource,
  compileStatus: {
    solidityVersion: "Solidity 0.8.20",
    ok: true,
    gas: "1205 gas",
    time: "0.34s",
  },
  summary: {
    description: [
      "The SampleVault contract is a simple ETH vault that allows users to",
      "deposit and withdraw ETH. It keeps track of user balances and",
      "allows the contract owner to manage the contract.",
    ],
    purpose: "ETH Vault / Balance Management",
    type: "Payable",
    visibility: "Public",
    compiler: "0.8.20",
    linesOfCode: 36,
    estimatedGasAvg: "~1205",
  },
  keyFeatures: [
    "Users can deposit ETH",
    "Users can withdraw their balance",
    "Owner is set at deployment",
    "Events for Deposit & Withdraw",
    "View function to check balance",
  ],
  details: {
    contractName: "SampleVault",
    language: "Solidity",
    chain: "Ethereum",
    license: "MIT",
    optimization: "Enabled (200 runs)",
    evmVersion: "Paris",
  },
  attacks: [
    {
      title: "Reentrancy Attack",
      severity: "high",
      description:
        "The withdraw() function transfers ETH before updating state. This can allow reentrancy.",
    },
    {
      title: "Denial of Service (DoS)",
      severity: "medium",
      description:
        "Using call() could fail for contracts that revert on receive, locking funds.",
    },
    {
      title: "Front-running",
      severity: "low",
      description:
        "Users can be front-run in deposit/withdraw scenarios in certain integrations.",
    },
  ],
  improvements: [
    {
      title: "Fix Reentrancy Vulnerability",
      severity: "high",
      reason: "State update happens after external call.",
      how: "Follow Checks-Effects-Interactions pattern.",
    },
    {
      title: "Use ReentrancyGuard",
      severity: "medium",
      reason: "Extra protection against reentrancy.",
      how: "Inherit from ReentrancyGuard.",
    },
    {
      title: "Add Withdrawal Limit (Optional)",
      severity: "low",
      reason: "Prevent large single withdrawals.",
      how: "Add max limit or cooldown.",
    },
  ],
};

export function getContractAnalysis(address: string): ContractAnalysis {
  return { ...sampleAnalysis, address };
}
