import React, { useState } from 'react';
import {
  Shield,
  Sword,
  Heart,
  Trash2,
  User,
  Users,
  Sparkles,
  Zap,
  Crown,
  Shirt,
  Footprints,
  Package,
  Check,
  X,
  Crosshair,
} from 'lucide-react';
import { RPG_RARITY_META, RPG_SLOT_LABELS } from '../engine/rpgCatalog';
import type { RpgItem, RpgOwnerTarget, RpgSlot, RpgStateSnapshot } from '../types/simulation';

interface RpgInventoryModalProps {
  rpg: RpgStateSnapshot;
  onClose: () => void;
  onEquipItem: (uid: string, target: RpgOwnerTarget) => void;
  onUnequipSlot: (target: RpgOwnerTarget, slot: RpgSlot) => void;
  onDeleteItem: (uid: string) => void;
}

export const RpgInventoryModal: React.FC<RpgInventoryModalProps> = ({
  rpg,
  onClose,
  onEquipItem,
  onUnequipSlot,
  onDeleteItem,
}) => {
  const [activeTarget, setActiveTarget] = useState<RpgOwnerTarget>('player');

  const stats = activeTarget === 'player' ? rpg.playerStats : rpg.companionStats;
  const equipped = activeTarget === 'player' ? rpg.playerEquipped : rpg.companionEquipped;
  const hpPercent = Math.round((rpg.hp / rpg.maxHp) * 100);

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-auto bg-black/82 flex items-center justify-center p-3 sm:p-6"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="w-[min(680px,96vw)] max-h-[88dvh] overflow-y-auto rounded-3xl bg-[#090d14]/96 border border-purple-500/35 shadow-2xl p-4 sm:p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-semibold text-white">
                RPG Инвентарь и Снаряжение
              </h2>
              <p className="text-xs text-slate-400">
                Легендарный лут, броня, бластеры и световые мечи
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/40 border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTarget('player')}
            className={`min-h-[42px] px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTarget === 'player'
                ? 'bg-purple-500/25 border border-purple-400/50 text-white shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <User className="w-4 h-4 text-purple-300" />
            <span>Игрок (Вы)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTarget('companion')}
            className={`min-h-[42px] px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTarget === 'companion'
                ? 'bg-rose-500/25 border border-rose-400/50 text-white shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 text-rose-300" />
            <span>Спутница (Хиллер)</span>
          </button>
        </div>

        {/* Character Preview & Equipped Slots Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
          {/* SVG Live Mini Character Preview */}
          <div className="rounded-2xl bg-black/50 border border-white/10 p-4 flex flex-col items-center justify-center gap-3 relative overflow-hidden">
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300">
              {activeTarget === 'player' ? 'Игрок' : 'Спутница'}
            </div>

            <svg viewBox="0 0 120 180" className="w-28 h-40 drop-shadow-lg">
              {/* Glow aura if legendary/epic */}
              <ellipse cx="60" cy="90" rx="36" ry="60" fill={stats.weaponColor} opacity="0.12" />
              {/* Head */}
              <circle
                cx="60"
                cy="32"
                r="18"
                fill={equipped.head ? equipped.head.colorHex : '#dcb49a'}
                stroke={equipped.head ? RPG_RARITY_META[equipped.head.rarity].hex : '#94a3b8'}
                strokeWidth="2"
              />
              {/* Torso */}
              <rect
                x="38"
                y="54"
                width="44"
                height="56"
                rx="8"
                fill={equipped.torso ? equipped.torso.colorHex : activeTarget === 'player' ? '#334155' : '#ebe4d7'}
                stroke={equipped.torso ? RPG_RARITY_META[equipped.torso.rarity].hex : '#94a3b8'}
                strokeWidth="2"
              />
              {/* Legs */}
              <rect
                x="42"
                y="112"
                width="16"
                height="54"
                rx="5"
                fill={equipped.legs ? equipped.legs.colorHex : '#1e293b'}
                stroke={equipped.legs ? RPG_RARITY_META[equipped.legs.rarity].hex : '#94a3b8'}
                strokeWidth="2"
              />
              <rect
                x="62"
                y="112"
                width="16"
                height="54"
                rx="5"
                fill={equipped.legs ? equipped.legs.colorHex : '#1e293b'}
                stroke={equipped.legs ? RPG_RARITY_META[equipped.legs.rarity].hex : '#94a3b8'}
                strokeWidth="2"
              />
              {/* Held Weapon Glow & Beam */}
              {equipped.weapon && (
                <g transform="translate(84, 80)">
                  <line
                    x1="0"
                    y1="0"
                    x2="12"
                    y2="-35"
                    stroke={stats.weaponColor}
                    strokeWidth={equipped.weapon.weaponKind === 'lightsaber' ? '5' : '3'}
                    strokeLinecap="round"
                  />
                  <circle cx="12" cy="-35" r="4" fill={stats.weaponColor} />
                </g>
              )}
            </svg>

            {/* HP Bar */}
            <div className="w-full flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-500" />
                  <span>Здоровье</span>
                </span>
                <span className="font-mono-tabular font-semibold text-rose-200">
                  {Math.round(rpg.hp)} / {rpg.maxHp} ({hpPercent}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-rose-500 transition-all"
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
            </div>

            {/* Stats Summary Pills */}
            <div className="grid grid-cols-2 gap-1.5 w-full text-[11px]">
              <div className="px-2 py-1 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <span className="text-slate-400">Броня</span>
                <span className="font-mono font-semibold text-cyan-300">+{stats.armorPct}</span>
              </div>
              <div className="px-2 py-1 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <span className="text-slate-400">Урон</span>
                <span className="font-mono font-semibold text-amber-300">{stats.attackDmg}</span>
              </div>
            </div>
          </div>

          {/* Equipped Slots (2 columns) */}
          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(['head', 'torso', 'legs', 'weapon', 'gadget'] as RpgSlot[]).map((slot) => {
              const item = equipped[slot];
              const rarityMeta = item ? RPG_RARITY_META[item.rarity] : null;
              return (
                <div
                  key={slot}
                  className={`rounded-2xl border p-3 flex flex-col justify-between gap-2 transition-all ${
                    item && rarityMeta
                      ? `${rarityMeta.bgCls} ${rarityMeta.borderCls}`
                      : 'bg-black/35 border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 shrink-0">
                        {slot === 'head' && <Crown className="w-4 h-4 text-amber-300" />}
                        {slot === 'torso' && <Shirt className="w-4 h-4 text-sky-300" />}
                        {slot === 'legs' && <Footprints className="w-4 h-4 text-emerald-300" />}
                        {slot === 'weapon' && <Sword className="w-4 h-4 text-purple-300" />}
                        {slot === 'gadget' && <Zap className="w-4 h-4 text-cyan-300" />}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                          {RPG_SLOT_LABELS[slot]}
                        </span>
                        <h4 className="text-xs sm:text-sm font-semibold text-white truncate">
                          {item ? item.name : 'Пустой слот'}
                        </h4>
                      </div>
                    </div>

                    {item && rarityMeta && (
                      <div className="flex items-center gap-1 shrink-0">
                        {item.isUnique && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-amber-300/70 bg-amber-500/20 text-amber-200">
                            Уникальный
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${rarityMeta.borderCls} ${rarityMeta.textCls}`}
                        >
                          {rarityMeta.label}
                        </span>
                      </div>
                    )}
                  </div>

                  {item ? (
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                      <div className="text-[11px] text-slate-300 font-mono-tabular">
                        {item.hpBonus > 0 && <span className="text-rose-300 mr-2">+{item.hpBonus} HP</span>}
                        {item.armorBonus > 0 && <span className="text-cyan-300 mr-2">+{item.armorBonus} Бр</span>}
                        {item.damageBonus > 0 && <span className="text-amber-300 mr-2">+{item.damageBonus} Урон</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => onUnequipSlot(activeTarget, slot)}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-medium text-slate-200 transition-colors"
                      >
                        Снять
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 italic">Наденьте вещь из инвентаря</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Inventory Bag List */}
        <div className="flex flex-col gap-2 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-semibold text-white flex items-center gap-1.5">
              <Package className="w-4 h-4 text-purple-300" />
              <span>Рюкзак с лутом ({rpg.inventory.length} предметов)</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              Нажмите «На себя» или «На неё» для экипировки
            </span>
          </div>

          {rpg.inventory.length === 0 ? (
            <div className="rounded-2xl bg-black/40 border border-white/10 p-6 text-center text-xs text-slate-400">
              Рюкзак пуст. Исследуйте планеты, побеждайте гопников или проходите квесты, чтобы найти эпическое и легендарное снаряжение!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
              {rpg.inventory.map((item) => {
                const rarityMeta = RPG_RARITY_META[item.rarity];
                return (
                  <div
                    key={item.uid}
                    className={`rounded-2xl border p-3 flex flex-col justify-between gap-2.5 ${rarityMeta.bgCls} ${rarityMeta.borderCls}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-white truncate">{item.name}</span>
                          {item.isUnique && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-300/70 bg-amber-500/20 text-amber-200 shrink-0">
                              Уникальный
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${rarityMeta.borderCls} ${rarityMeta.textCls} shrink-0`}
                          >
                            {rarityMeta.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">{item.desc}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                      <div className="text-[10px] font-mono text-slate-300">
                        {item.hpBonus > 0 && <span className="text-rose-300 mr-2">+{item.hpBonus} HP</span>}
                        {item.armorBonus > 0 && <span className="text-cyan-300 mr-2">+{item.armorBonus} Бр</span>}
                        {item.damageBonus > 0 && <span className="text-amber-300 mr-2">+{item.damageBonus} Урон</span>}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEquipItem(item.uid, activeTarget)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all ${
                            activeTarget === 'player'
                              ? 'bg-purple-500/30 hover:bg-purple-500/40 border border-purple-400/50 text-purple-100'
                              : 'bg-rose-500/30 hover:bg-rose-500/40 border border-rose-400/50 text-rose-100'
                          }`}
                        >
                          {activeTarget === 'player' ? 'На себя' : 'На неё'}
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteItem(item.uid)}
                          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-rose-500/25 border border-white/10 text-slate-400 hover:text-rose-200 flex items-center justify-center transition-colors"
                          aria-label="Удалить вещь"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
