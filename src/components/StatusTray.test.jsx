import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import StatusTray from './StatusTray.jsx';
import { DEFAULT_FOOD } from '../lib/food.js';
import { DEFAULT_RULESET } from '../lib/rulesets.js';

afterEach(() => cleanup());

const players = [
  { id: 'p1', name: 'Ginger', isCPU: false },
  { id: 'p2', name: 'Rocky', isCPU: true },
];
const foodShapeIds = DEFAULT_FOOD.shapes.map((s) => s.id);

describe('StatusTray', () => {
  it('lists player names, marking CPU players', () => {
    render(
      <StatusTray
        players={players}
        food={DEFAULT_FOOD}
        foodShapeIds={foodShapeIds}
        ruleset={DEFAULT_RULESET}
        actionLog={[]}
      />,
    );

    expect(screen.getByText('Ginger, Rocky (CPU)')).toBeDefined();
  });

  it('shows the selected Food shapes by name', () => {
    render(
      <StatusTray
        players={players}
        food={DEFAULT_FOOD}
        foodShapeIds={['chip']}
        ruleset={DEFAULT_RULESET}
        actionLog={[]}
      />,
    );

    expect(screen.getByText('Chip')).toBeDefined();
  });

  it('shows "None" for Ruleset when nothing is enabled', () => {
    render(
      <StatusTray
        players={players}
        food={DEFAULT_FOOD}
        foodShapeIds={foodShapeIds}
        ruleset={DEFAULT_RULESET}
        actionLog={[]}
      />,
    );

    const rulesetRow = screen.getByText('Ruleset').closest('div');
    expect(within(rulesetRow).getByText('None')).toBeDefined();
  });

  it('lists enabled ruleset options and the chosen skin', () => {
    render(
      <StatusTray
        players={players}
        food={DEFAULT_FOOD}
        foodShapeIds={foodShapeIds}
        ruleset={{
          ...DEFAULT_RULESET,
          allowMoving: true,
          allowCustomSkins: true,
          skin: 'alpha-pixel-art',
        }}
        actionLog={[]}
      />,
    );

    const rulesetRow = screen.getByText('Ruleset').closest('div');
    expect(within(rulesetRow).getByText(/Allow Moving/)).toBeDefined();
    expect(
      within(rulesetRow).getByText(/Custom Skins \(Alpha Pixel Art\)/),
    ).toBeDefined();
  });

  it('shows a placeholder when no actions have been played yet', () => {
    render(
      <StatusTray
        players={players}
        food={DEFAULT_FOOD}
        foodShapeIds={foodShapeIds}
        ruleset={DEFAULT_RULESET}
        actionLog={[]}
      />,
    );

    expect(screen.getByText('No actions played yet.')).toBeDefined();
  });

  it('lists the action log entries in the order given', () => {
    render(
      <StatusTray
        players={players}
        food={DEFAULT_FOOD}
        foodShapeIds={foodShapeIds}
        ruleset={DEFAULT_RULESET}
        actionLog={[
          { id: 1, text: 'Ginger claimed Chip' },
          { id: 2, text: 'Rocky played Sparrow' },
        ]}
      />,
    );

    const list = screen.getByRole('list', { name: 'Recent actions' });
    const items = within(list).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      'Ginger claimed Chip',
      'Rocky played Sparrow',
    ]);
  });
});
