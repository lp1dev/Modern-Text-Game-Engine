import { Game } from './class';
import { InvalidDataFormatException } from './exceptions';
import gameData from '../mock/game';
import { unparsedQuestions } from '../mock/questions';
import { textData } from '../mock/texts';

describe('Game', () => {
  //
  it('should allow us to create a new game instance w/ data', () => {
      const game = new Game(gameData, textData);
      game.start();
      expect(game.name).toBe(gameData.name);
  });
  //
  it('should start with the first question', () => {
    const game = new Game(gameData, textData);
    game.start();
    const question = game.display();
    expect(question.text).toBe(textData['T_GAME_INTRO']['EN_en']);
  });
  //
  it('should allow to answer a question and go to the next one', () => {
    const game = new Game(gameData, textData);
    game.start();
    game.answer(textData['T_GAME_INTRO2']['EN_en']);
    const nextQuestion = game.display();
    expect(nextQuestion.text).toBe(textData['T_CHAPTER1']['EN_en']);
  });
  //
  it('should save the game state and use it', () => {
    let game = new Game(gameData, textData);
    game.start();
    const saveData = game.getSaveData();
    game = new Game(gameData, textData, 'EN_en', saveData);
    expect(game.display().text).toBe(textData['T_GAME_INTRO']['EN_en']);
  });
});
