import test from 'node:test'; import assert from 'node:assert/strict'; import { masteryBand, nextMastery, chooseQuestions } from './mastery.js';
test('mastery bands are supportive and ordered',()=>{assert.equal(masteryBand(20),'Needs Practice');assert.equal(masteryBand(82),'Strong');assert.equal(masteryBand(95),'Mastered')});
test('correct answers increase and incorrect answers decrease mastery',()=>{assert.ok(nextMastery(50,true)>50);assert.ok(nextMastery(50,false)<50)});
test('question selector avoids previous attempts and is deterministic',()=>{const q=[{id:'b',difficulty:3},{id:'a',difficulty:3}];assert.deepEqual(chooseQuestions(q,[{questionId:'a'}],1).map(x=>x.id),['b'])});
