import React, { useState } from 'react';
import {
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
  X,
  Gem,
  ArrowLeftRight,
} from 'lucide-react';
import {
  RPG_RARITY_META,
  RPG_SLOT_LABELS,
  canEquipOnTarget,
  isSharedWearable,
} from '../engine/rpgCatalog';
import type { RpgItem, RpgOwnerTarget, RpgSlot, RpgStateSnapshot } from '../types/simulation';

interface RpgInventoryModalProps {
  rpg: RpgStateSnapshot;
  onClose: () => void;
  onEquipItem: (uid: string, target: RpgOwnerTarget) => void;
  onUnequipSlot: (target: RpgOwnerTarget, slot: RpgSlot) => void;
  onDeleteItem: (uid: string) => void;
  onTransferItem: (uid: string, toTarget: RpgOwnerTarget) => void;
}

export const RpgInventoryModal: React.FC<RpgInventoryModalProps> = ({
  rpg,
  onClose,
  onEquipItem,
  onUnequipSlot,
  onDeleteItem,
  onTransferItem,
}) => {
  const [activeTarget, setActiveTarget] = useState<RpgOwnerTarget>('player');

  const stats = activeTarget === 'player' ? rpg.playerStats : rpg.companionStats;
  const equipped = activeTarget === 'player' ? rpg.playerEquipped : rpg.companionEquipped;
  const activeBag = activeTarget === 'player' ? rpg.playerInventory : rpg.companionInventory;
  const hasMythic = Object.values(equipped).some((it) => it?.rarity === 'mythic');
  const hpPercent = Math.round((rpg.hp / rpg.maxHp) * 100);

  const effectLabel = (item: RpgItem): string | null => {
    if (item.effectStyle === 'ember') return 'Эффект: Огненные искры';
    if (item.effectStyle === 'solar') return 'Эффект: Солнечный ореол';
    if (item.effectStyle === 'nova') return 'Эффект: Оранжевая сверхновая';
    return null;
  };

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
                Раздельные сумки · одежда и оранжевые вещи подходят обоим, серьги и мечи — ей, бластеры — вам
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
            <span>Игрок ({rpg.playerInventory.length})</span>
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
            <span>Спутница ({rpg.companionInventory.length})</span>
          </button>
        </div>

        {/* Character Preview & Equipped Slots Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
          {/* SVG Live Mini Character Preview */}
          <div
            className={`rounded-2xl bg-black/50 border p-4 flex flex-col items-center justify-center gap-3 relative overflow-hidden ${
              hasMythic
                ? 'border-orange-400/60 shadow-[0_0_24px_rgba(249,115,22,0.28)]'
                : 'border-white/10'
            }`}
          >
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300">
              {activeTarget === 'player' ? 'Игрок' : 'Спутница'}
            </div>
            {hasMythic && (
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-orange-500/25 border border-orange-400/60 text-[10px] font-semibold text-orange-200 animate-pulse">
                Аура
              </div>
            )}

            <svg viewBox="0 0 120 180" className="w-28 h-40 drop-shadow-lg">
              {/* Mythic fiery aura */}
              {hasMythic && (
                <>
                  <ellipse cx="60" cy="95" rx="46" ry="70" fill="#f97316" opacity="0.18" />
                  <circle cx="24" cy="50" r="3" fill="#fb923c" />
                  <circle cx="96" cy="46" r="2.6" fill="#fdba74" />
                  <circle cx="22" cy="128" r="2.8" fill="#f97316" />
                  <circle cx="98" cy="122" r="3.2" fill="#fb923c" />
                </>
              )}
              {/* Gadget cyber-halo / wings behind shoulders */}
              {equipped.gadget && (
                <g opacity="0.85">
                  <path
                    d="M 22 68 Q 60 36 98 68"
                    fill="none"
                    stroke={equipped.gadget.colorHex}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <circle cx="22" cy="68" r="4" fill={equipped.gadget.colorHex} />
                  <circle cx="98" cy="68" r="4" fill={equipped.gadget.colorHex} />
                </g>
              )}
              {/* Torso cloak / shoulder pauldrons */}
              {equipped.torso && (
                <>
                  <path
                    d="M 32 58 L 24 128 L 96 128 L 88 58 Z"
                    fill={equipped.torso.accentHex ?? equipped.torso.colorHex}
                    opacity="0.32"
                  />
                  <circle cx="35" cy="59" r="8" fill={equipped.torso.accentHex ?? equipped.torso.colorHex} />
                  <circle cx="85" cy="59" r="8" fill={equipped.torso.accentHex ?? equipped.torso.colorHex} />
                </>
              )}
              {/* Glow aura if legendary/epic */}
              <ellipse cx="60" cy="90" rx="36" ry="60" fill={stats.weaponColor} opacity="0.12" />
              {/* Head */}
              <circle
                cx="60"
                cy="34"
                r="17"
                fill={activeTarget === 'companion' ? '#f3d2b8' : equipped.head ? equipped.head.colorHex : '#dcb49a'}
                stroke={equipped.head ? RPG_RARITY_META[equipped.head.rarity].hex : '#94a3b8'}
                strokeWidth="2"
              />
              {/* Companion hair */}
              {activeTarget === 'companion' && (
                <path
                  d="M 42 32 Q 60 10 78 32 L 82 56 L 74 52 L 46 52 L 38 56 Z"
                  fill="#ecd28b"
                  opacity="0.92"
                />
              )}
              {/* Head gear crown / visor */}
              {equipped.head && (
                <path
                  d="M 44 24 L 52 14 L 60 22 L 68 14 L 76 24 Z"
                  fill={equipped.head.colorHex}
                  stroke={RPG_RARITY_META[equipped.head.rarity].hex}
                  strokeWidth="1.4"
                />
              )}
              {/* Companion Earrings Preview */}
              {activeTarget === 'companion' && equipped.earrings && (
                <g>
                  <circle
                    cx="41"
                    cy="38"
                    r="2.4"
                    fill="none"
                    stroke={equipped.earrings.accentHex ?? equipped.earrings.colorHex}
                    strokeWidth="1.3"
                  />
                  <polygon
                    points="41,41 38.5,46 41,51 43.5,46"
                    fill={equipped.earrings.colorHex}
                    stroke={equipped.earrings.accentHex ?? '#fde68a'}
                    strokeWidth="0.9"
                  />
                  <circle
                    cx="79"
                    cy="38"
                    r="2.4"
                    fill="none"
                    stroke={equipped.earrings.accentHex ?? equipped.earrings.colorHex}
                    strokeWidth="1.3"
                  />
                  <polygon
                    points="79,41 76.5,46 79,51 81.5,46"
                    fill={equipped.earrings.colorHex}
                    stroke={equipped.earrings.accentHex ?? '#fde68a'}
                    strokeWidth="0.9"
                  />
                </g>
              )}
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
              {/* Legs & Boot Trim */}
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
              {equipped.legs && (
                <>
                  <rect x="41" y="146" width="18" height="12" rx="3" fill={equipped.legs.accentHex ?? equipped.legs.colorHex} />
                  <rect x="61" y="146" width="18" height="12" rx="3" fill={equipped.legs.accentHex ?? equipped.legs.colorHex} />
                </>
              )}
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
            {(activeTarget === 'companion'
              ? (['head', 'torso', 'legs', 'earrings', 'weapon', 'gadget'] as RpgSlot[])
              : (['head', 'torso', 'legs', 'weapon', 'gadget'] as RpgSlot[])
            ).map((slot) => {
              const item = equipped[slot];
              const rarityMeta = item ? RPG_RARITY_META[item.rarity] : null;
              const fxText = item ? effectLabel(item) : null;
              return (
                <div
                  key={slot}
                  className={`rounded-2xl border p-3 flex flex-col justify-between gap-2 transition-all ${
                    item && rarityMeta
                      ? `${rarityMeta.bgCls} ${rarityMeta.borderCls} ${
                          item.rarity === 'mythic' ? 'shadow-[0_0_16px_rgba(249,115,22,0.28)]' : ''
                        }`
                      : 'bg-black/35 border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 shrink-0">
                        {slot === 'head' && <Crown className="w-4 h-4 text-amber-300" />}
                        {slot === 'torso' && <Shirt className="w-4 h-4 text-sky-300" />}
                        {slot === 'legs' && <Footprints className="w-4 h-4 text-emerald-300" />}
                        {slot === 'earrings' && <Gem className="w-4 h-4 text-rose-300" />}
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

                  {fxText && (
                    <div className="text-[10px] font-medium text-orange-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 shrink-0" />
                      <span>{fxText}</span>
                    </div>
                  )}

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
              <span>
                {activeTarget === 'player' ? 'Ваш рюкзак' : 'Инвентарь спутницы'} ({activeBag.length} шт.)
              </span>
            </h3>
              <span className="text-[11px] text-slate-400">
                Общую одежду и оранжевые вещи можно передать друг другу
              </span>
            </div>

          {activeBag.length === 0 ? (
            <div className="rounded-2xl bg-black/40 border border-white/10 p-6 text-center text-xs text-slate-400">
              В этой сумке пока пусто. Побеждайте боссов, монстров планеты или выполняйте особые квесты в кафе и у Сербоса!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
              {activeBag.map((item) => {
                const rarityMeta = RPG_RARITY_META[item.rarity];
                const fxText = effectLabel(item);
                const otherTarget: RpgOwnerTarget = activeTarget === 'player' ? 'companion' : 'player';
                const canWearHere = canEquipOnTarget(item, activeTarget);
                const transferable = isSharedWearable(item) || canEquipOnTarget(item, otherTarget);
                return (
                  <div
                    key={item.uid}
                    className={`rounded-2xl border p-3 flex flex-col justify-between gap-2.5 ${rarityMeta.bgCls} ${rarityMeta.borderCls} ${
                      item.rarity === 'mythic' ? 'shadow-[0_0_16px_rgba(249,115,22,0.28)]' : ''
                    }`}
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
                        {fxText && (
                          <div className="text-[10px] font-medium text-orange-300 mt-1 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 shrink-0" />
                            <span>{fxText}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                      <div className="text-[10px] font-mono text-slate-300">
                        {item.hpBonus > 0 && <span className="text-rose-300 mr-2">+{item.hpBonus} HP</span>}
                        {item.armorBonus > 0 && <span className="text-cyan-300 mr-2">+{item.armorBonus} Бр</span>}
                        {item.damageBonus > 0 && <span className="text-amber-300 mr-2">+{item.damageBonus} Урон</span>}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {canWearHere ? (
                          <button
                            type="button"
                            onClick={() => onEquipItem(item.uid, activeTarget)}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all ${
                              item.rarity === 'mythic'
                                ? 'bg-orange-500/35 hover:bg-orange-500/45 border border-orange-400/65 text-orange-50'
                                : activeTarget === 'player'
                                  ? 'bg-purple-500/30 hover:bg-purple-500/40 border border-purple-400/50 text-purple-100'
                                  : 'bg-rose-500/30 hover:bg-rose-500/40 border border-rose-400/50 text-rose-100'
                            }`}
                          >
                            Надеть
                          </button>
                        ) : (
                          <span className="px-2 py-1 rounded-xl bg-white/5 border border-white/10 text-[10px] text-slate-400">
                            {otherTarget === 'companion' ? 'Только ей' : 'Только вам'}
                          </span>
                        )}

                        {transferable && (
                          <button
                            type="button"
                            onClick={() => onTransferItem(item.uid, otherTarget)}
                            title={otherTarget === 'companion' ? 'Передать спутнице' : 'Передать себе'}
                            className="px-2 py-1 rounded-xl bg-white/5 hover:bg-white/15 border border-white/15 text-[10px] font-medium text-slate-200 inline-flex items-center gap-1 transition-colors"
                          >
                            <ArrowLeftRight className="w-3 h-3 text-cyan-300" />
                            <span>{otherTarget === 'companion' ? 'Ей' : 'Себе'}</span>
                          </button>
                        )}

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
