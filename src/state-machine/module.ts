import { State, Instruction } from './interfaces';
import { InvalidInstructionFormatException, InvalidInstructionTypeException, UndefinedValueException } from '../game/exceptions';

// Instructions

const knownOperands = ['==', 'IS', 'IS_NOT', '!=', '>', '<', '>=', '<='];

const operands = {
  '==': (a, b) => a == b,
  'IS': (a, b) => a === b,
  'IS_NOT': (a, b) => a !== b,
  '!=': (a, b) => a !== b,
  '>': (a, b) => a > b,
  '<': (a, b) => a < b,
  '>=': (a, b) => a >= b,
  '<=': (a, b) => a <= b
};

function goto(params: Array<string>, state: State) {
  set(['question', params[0]], state);
}

function set(params: Array<any>, state: State) {
  if (params.length !== 2 || !params[1]) {
    throw new InvalidInstructionFormatException('Invalid parameters', params);
  }
  state[params[0]] = params[1];
}

function copy(params: Array<string>, state: State) {
  if (params.length !== 2 || !params[1]) {
    throw new InvalidInstructionFormatException('Invalid parameters', params);
  }
  set([params[1], state[params[0]]], state);
}

function roll(params: Array<string>, state: State) {
  if (params.length !== 2 || !params[1]) {
    throw new InvalidInstructionFormatException('Invalid parameters', params);
  }
  const dice = parseInt(params[0]);
  if (isNaN(dice) || dice > 1000 || dice <= 0) {
    throw new InvalidInstructionFormatException('Invalid dice type', params[0]);
  }
  const value = Math.ceil(Math.random() * dice);
  set([params[1], value], state);
}

function evaluate(expressionString: string, state: State) {
  let conditionals = [];
  let expressions = [[]];
  let results = [];

  expressionString.trim().split(' ').forEach(term => {
    if (term == 'AND' || term == 'OR') {
      expressions.push([]);
      conditionals.push(term);
    } else {
      expressions[expressions.length - 1].push(term);
    }
  });
  expressions.forEach(expression => {
    let leftValue = null;
    let rightValue = null;
    let operand = null;

    expression.forEach(term => {
      if (knownOperands.indexOf(term) !== -1) {
        if (!leftValue) {
          throw new InvalidInstructionFormatException(expression.join(' '));
        }
        operand = term;
      } else {
        const value = state[term] ? state[term] : term;
        if (!leftValue) {
          leftValue = value;
        } else if (!rightValue) {
          rightValue = value;
        } else {
          throw new InvalidInstructionFormatException(expression.join(' '));
        }
      }
    });
    results.push(operands[operand](leftValue, rightValue));
  });
  if (conditionals.length) {
    conditionals.forEach((conditional, index) => {
      if (index + 1 > results.length) {
        throw new InvalidInstructionFormatException(expressionString);
      }
      if (conditional == 'AND') {
        results.push(results[index] && results[index + 1]);
      } else if (conditional == 'OR') {
        results.push(results[index] || results[index + 1]);
      }
    });
  }
  return results.pop();
}

function ifInstruction(params: Array<string>, state: State) {
  const thenPosition = params.indexOf('THEN');
  const elsePosition = params.indexOf('ELSE');
  if (thenPosition === -1) {
    throw new InvalidInstructionFormatException('IF expression should contain an ELSE statement');
  } else {
    const ifExpression = params.slice(0, thenPosition);
    const result = evaluate(ifExpression.join(' '), state);
    if (result === true) {
      const thenExpression = (elsePosition !== -1) ? params.slice(thenPosition + 1, elsePosition) : params.slice(thenPosition + 1);
      StateMachine.process(thenExpression.join(' '), state);
    } else if (elsePosition !== -1) {
      const elseExpression = params.slice(elsePosition + 1);
      StateMachine.process(elseExpression.join(' '), state);
    }
  }
}

function calc(type: string, params: Array<string>, state: State) {
  if (params.length !== 2) {
    throw new InvalidInstructionFormatException([type, ...params].join(' '));
  }
  const a = isNaN(parseInt(params[0])) ? state[params[0]] : parseInt(params[0]);
  const b = isNaN(parseInt(params[1])) ? state[params[1]] : parseInt(params[1]);
  if (!a || !b) {
    throw new UndefinedValueException(a ? a : b);
  }
  switch (type) {
    case 'ADD':
      state[params[0]] = a + b;
      break;
    case 'SUB':
      state[params[0]] = a - b;
      break;
    case 'MUL':
      state[params[0]] = a * b;
      break;
  }
}

module StateMachine {
  const instructionTypes = {
    'GOTO': goto,
    'SET': set,
    'COPY': copy,
    'ROLL': roll,
    'IF': ifInstruction,
    'ADD': (params, state) => calc('ADD', params, state),
    'SUB': (params, state) => calc('SUB', params, state),
    'MUL': (params, state) => calc('MUL', params, state)
  }

  export function handleInstruction(
    instruction: Instruction, state: State) {
    if (instructionTypes[instruction.type]) {
      instructionTypes[instruction.type](instruction.params, state);
    } else {
      throw new InvalidInstructionTypeException(instruction.type);
    }
  }

  export function process(instructionsString: string, state: State) {
    const instructions = instructionsString ? instructionsString.split(';') : [];
    instructions.forEach(instruction => {
      const splitInstruction = instruction.split(' ').filter(s => s.length);
      if (splitInstruction.length < 2) {
        throw new InvalidInstructionFormatException(instruction);
      }
      const type = splitInstruction.splice(0, 1)[0];
      const params = splitInstruction;
      handleInstruction({
        type: type,
        params: params
      }, state);
    });
    return state;
  }
}

export default StateMachine;
