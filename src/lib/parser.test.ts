import { describe, it, expect } from 'vitest';
import { objectiveParser, rewardParser } from '@/lib/parser';

describe('objectiveParser', () => {
  it('parses single collect with two deliveries', () => {
    const input = [
      'Collect Tungsten from ARC-L1 Wide Forest Station.',
      'Deliver 0/42 SCU to Seraphim Station.',
      'Deliver 0/52 SCU to Baijini Point.',
    ].join('\n');

    const result = objectiveParser(input);

    expect(result).toEqual([
      {
        item: 'Tungsten',
        location: 'ARC-L1 Wide Forest Station',
        deliveries: [
          { quantity: 42, location: 'Seraphim Station' },
          { quantity: 52, location: 'Baijini Point' },
        ],
      },
    ]);
  });

  it('parses multiple jobs', () => {
    const input = [
      'Collect Tungsten from ARC-L1 Wide Forest Station.',
      'Deliver 0/10 SCU to Station A.',
      'Collect Laranite from Orison.',
      'Deliver 0/20 SCU to Station B.',
    ].join('\n');

    const result = objectiveParser(input);

    expect(result).toEqual([
      {
        item: 'Tungsten',
        location: 'ARC-L1 Wide Forest Station',
        deliveries: [
          { quantity: 10, location: 'Station A' },
        ],
      },
      {
        item: 'Laranite',
        location: 'Orison',
        deliveries: [
          { quantity: 20, location: 'Station B' },
        ],
      },
    ]);
  });

  it('handles Deliver 07 normalization', () => {
    const input = [
      'Collect Agricium from Area18.',
      'Deliver 07 SCU to TDD.',
    ].join('\n');

    const result = objectiveParser(input);
    expect(result[0].deliveries[0]).toEqual({ quantity: 7, location: 'TDD' });
  });

  it('ignores unrelated lines and returns empty for no matches', () => {
    const input = [
      'PRIMARY OBJECTIVES',
      'Some random header',
    ].join('\n');
    const result = objectiveParser(input);
    expect(result).toEqual([]);
  });

  it('handles random examples1', () => {
    const input = [
        'objective ¢ Collect Quartz (Raw) from Port Tressler.',
        '< Deliver 0/82 SCU of Quartz (Raw) to Shallow',
        'Frontier Station at microTech\'s L1 Lagrange point.',
    ].join('\n');
    const result = objectiveParser(input);
    expect(result).toEqual([
      {
        item: 'Quartz (Raw)',
        location: 'Port Tressler',
        deliveries: [
          { quantity: 82, location: 'Shallow Frontier Station at microTech\'s L1 Lagrange point' },
        ],
      },
    ]);
  });

  it('handles random examples2', () => {
    const input = [
    'objective & Collect Tin from Port Tressler.',
    '< Deliver 0/90 SCU of Tin to NB Int. Spaceport on',
    'microTech.'
    ].join('\n');
    const result = objectiveParser(input);
    expect(result).toEqual([
       {
         item: "Tin",
         location: "Port Tressler",
         deliveries: [
           {
             location: "NB Int. Spaceport on microTech.",
             quantity: 90,
           },
         ],
       },
    ]);
  });

  it('handles random examples3', () => {
    const input = [
        'objective < Collect Aluminum from Port Tressler.',
        '¢ Deliver 0/5 SCU of Aluminum to NB Int. Spaceport',
        'on microTech.',
        '© Deliver 0/4 SCU of Aluminum to Greycat Stanton IV',
        'Production Complex-A on microTech.',
        '|'
    ].join('\n');
    const result = objectiveParser(input);
    expect(result).toEqual([
      {
        item: 'Aluminum',
        location: 'Port Tressler',
        deliveries: [
          { quantity: 5, location: 'NB Int. Spaceport on microTech.' },
          { quantity: 4, location: 'Greycat Stanton IV Production Complex-A on microTech.' },
        ],
      },
    ]);
  });
});

describe('rewardParser', () => {
  it('parses numbers with commas', () => {
    expect(rewardParser('aUEC 123,456')).toBe(123456);
  });

  it('returns null when no number', () => {
    expect(rewardParser('No reward')).toBeNull();
  });
});


