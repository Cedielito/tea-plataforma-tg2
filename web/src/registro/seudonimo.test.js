/**
 * La copia de normalizarSeudonimo de la web (M-09, HU-19, CT-11) da lo mismo
 * que la de api/.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import api from '../../../api/src/dominio/registro/seudonimo.js';
import { normalizarSeudonimo } from './seudonimo.js';

describe('CT-11 seudónimo escrito a mano', () => {
  test('la web y la API normalizan igual', () => {
    const casos = [
      'ABCD-2345',
      'abcd-2345',
      ' abcd 2345 ',
      'ABCD2345',
      'ab cd-23 45',
      'ABCD-0000',
      'ABCI-2345',
      'ABC-2345',
      'ABCDE-2345',
      '',
      null,
      42,
      ...Array.from({ length: 50 }, () => api.generarSeudonimo())
    ];
    for (const caso of casos) assert.equal(normalizarSeudonimo(caso), api.normalizarSeudonimo(caso), String(caso));
  });
});
