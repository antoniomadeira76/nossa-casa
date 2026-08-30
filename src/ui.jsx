import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { S, R, elev, FONT, MEMBER_COLOR } from './theme';
import Icon from './Icon';

// Cartão: um enchimento só, 14/16, herdado do protótipo
export const Card = ({ t, children, style, pad = true }) => (
  <View style={[{
    backgroundColor: t.card, borderRadius: R.card,
    paddingVertical: pad ? 14 : 0, paddingHorizontal: pad ? 16 : 0,
    ...elev(1),
  }, style]}>{children}</View>
);

// Título de secção — slate, nunca preto, e 8 px acima do que rotula
export const SectionTitle = ({ t, children, right }) => (
  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: S.md, marginBottom: S.md }}>
    <Text style={{ flex: 1, fontFamily: FONT.display, fontSize: 20, fontWeight: '700',
      color: t.slate, letterSpacing: 0.1 }}>{children}</Text>
    {right}
  </View>
);

export const Label = ({ t, children }) => (
  <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.slate }}>{children}</Text>
);

// Pastilha de estado: não se toca. Para escolher, use Choice.
export const Pill = ({ label, fg, bg, border }) => (
  <View style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: R.pill,
    borderWidth: 1, borderColor: border, backgroundColor: bg }}>
    <Text style={{ fontFamily: FONT.ui, fontSize: 11, fontWeight: '600', color: fg }}>{label}</Text>
  </View>
);

// Chip de escolha: tocável, 44 de alvo, cor de ação lida do tema.
// Só fora de linhas tocáveis — uma linha, um destino.
export const Choice = ({ t, label, selected, onPress }) => (
  <Pressable onPress={onPress} accessibilityRole="button"
    accessibilityLabel={label} accessibilityState={{ selected: !!selected }}
    style={({ pressed }) => ({
      minHeight: 44, paddingHorizontal: S.lg, borderRadius: R.pill, borderWidth: 1,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: selected ? t.accent : t.card,
      borderColor: selected ? t.accent : t.border,
      opacity: pressed ? 0.85 : 1,
    })}>
    <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600',
      color: selected ? '#FFFFFF' : t.text2 }}>{label}</Text>
  </Pressable>
);

// Escolher um membro: grelha de dois por linha, com o ponto de cor de cada
// um — é assim nas referências 18, 19 e 20. Estava uma fila de quatro
// pastilhas sem ponto: os nomes cabiam à justa e nada dizia de quem era a
// cor que a linha do evento ou da tarefa depois mostra.
export const EscolherMembro = ({ t, valor, onEscolher, membros }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
    {membros.map(nome => {
      const on = valor === nome;
      return (
        <Pressable key={nome} onPress={() => onEscolher(nome)}
          accessibilityRole="button" accessibilityLabel={nome}
          accessibilityState={{ selected: on }}
          style={({ pressed }) => ({
            width: '47%', minHeight: 48, borderRadius: R.row, borderWidth: 1,
            paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
            borderColor: on ? t.chrome : t.border,
            backgroundColor: on ? t.chrome : pressed ? t.subtle : 'transparent',
          })}>
          <View style={{ width: 9, height: 9, borderRadius: R.pill,
            backgroundColor: MEMBER_COLOR[nome] || t.text3 }} />
          <Text style={{ fontFamily: FONT.body, fontSize: 15,
            color: on ? '#FFFFFF' : t.text2 }}>{nome}</Text>
        </Pressable>
      );
    })}
  </View>
);

// Alvo de toque nunca abaixo de 44
export const Tap = ({ onPress, label, children, style, size = 44 }) => (
  <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
    hitSlop={6}
    style={({ pressed }) => [{
      minWidth: size, minHeight: size, alignItems: 'center', justifyContent: 'center',
      opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }],
    }, style]}>{children}</Pressable>
);

// Linha de definição: o padrão da app — valor à direita, chevron
// `iconColor` é opcional e cai em t.slate — o «Precisa de Si» colore o ícone
// pela urgência da linha, o resto da app quer sempre a mesma cor.
export const Row = ({ t, icon, iconColor, title, sub, value, onPress, last, right }) => (
  <Pressable onPress={onPress} accessibilityRole={onPress ? 'button' : undefined}
    accessibilityLabel={onPress ? title : undefined}
    style={({ pressed }) => ({
      minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: t.divider,
      opacity: pressed ? 0.7 : 1,
    })}>
    {icon ? <Icon name={icon} size={20} color={iconColor || t.slate} /> : null}
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{title}</Text>
      {sub ? <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>{sub}</Text> : null}
    </View>
    {value ? <Text style={{ fontFamily: FONT.ui, fontSize: 13.5, fontWeight: '600', color: t.text2 }}>{value}</Text> : null}
    {right !== undefined ? right : (onPress ? <Icon name="caretRight" size={18} color={t.text3} /> : null)}
  </Pressable>
);

// Controlo segmentado: um contorno para o grupo, divisórias por dentro
// Aceita ['Uma vez', ...] ou [{value, label}, ...]. Passar strings cruas dava
// três segmentos em branco, todos «selecionados» por undefined === undefined.
export const Segmented = ({ t, options, value, onChange, small }) => (
  <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: t.border,
    borderRadius: R.row, overflow: 'hidden' }}>
    {options.map((raw, i) => {
      const o = typeof raw === 'string' ? { value: raw, label: raw } : raw;
      const on = value === o.value;
      return (
        <Pressable key={o.value} onPress={() => onChange(o.value)}
          accessibilityRole="button" accessibilityLabel={o.label}
          accessibilityState={{ selected: on }}
          style={{
            flex: 1, minHeight: small ? 38 : 44, alignItems: 'center', justifyContent: 'center',
            backgroundColor: on ? t.chrome : 'transparent',
            borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: t.border,
          }}>
          <Text style={{ fontFamily: FONT.ui, fontSize: 13,
            fontWeight: on ? '600' : '400', color: on ? '#FFFFFF' : t.text2 }}>{o.label}</Text>
        </Pressable>
      );
    })}
  </View>
);

export const Toggle = ({ t, on, onPress, label }) => (
  <Pressable onPress={onPress} accessibilityRole="switch" accessibilityState={{ checked: on }}
    accessibilityLabel={label} hitSlop={10}
    style={{ width: 46, height: 27, borderRadius: R.pill, padding: 3,
      backgroundColor: on ? t.chrome : t.border,
      alignItems: on ? 'flex-end' : 'flex-start', justifyContent: 'center' }}>
    <View style={{ width: 21, height: 21, borderRadius: R.pill, backgroundColor: '#FFFFFF', ...elev(1) }} />
  </Pressable>
);

// Botão principal: pílula, cor de ação
export const Primary = ({ t, label, icon, onPress, disabled }) => (
  <Pressable onPress={disabled ? undefined : onPress} accessibilityRole="button"
    accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }}
    style={({ pressed }) => ({
      minHeight: 48, borderRadius: R.pill, flexDirection: 'row',
      alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: disabled ? t.border : t.accent,
      opacity: pressed ? 0.9 : 1, ...(disabled ? {} : elev(3)),
    })}>
    {icon ? <Icon name={icon} size={20} color="#FFFFFF" /> : null}
    <Text style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: '700',
      color: '#FFFFFF', letterSpacing: 0.4 }}>{label}</Text>
  </Pressable>
);

// Ação secundária: contorno tracejado, minúsculas — o padrão "acrescentar"
export const AddButton = ({ t, label, onPress }) => (
  <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
    style={({ pressed }) => ({
      minHeight: 44, borderRadius: R.row, borderWidth: 1, borderStyle: 'dashed',
      borderColor: t.border, flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 8, opacity: pressed ? 0.7 : 1,
    })}>
    <Icon name="plus" size={18} color={t.text3} />
    <Text style={{ fontFamily: FONT.ui, fontSize: 13.5, color: t.text3 }}>{label}</Text>
  </Pressable>
);

// Avatar com a inicial — a informação não depende só da cor
export const Avatar = ({ initial, color, size = 24 }) => (
  <View style={{ width: size, height: size, borderRadius: R.pill, backgroundColor: color,
    alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontFamily: FONT.ui, fontSize: size * 0.46, fontWeight: '700', color: '#FFFFFF' }}>{initial}</Text>
  </View>
);

export const Bar = ({ t, pct, color, height = 8 }) => (
  <View style={{ height, borderRadius: R.pill, backgroundColor: t.page, overflow: 'hidden' }}>
    <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%',
      borderRadius: R.pill, backgroundColor: color }} />
  </View>
);

const TILE = {
  info: { border: (t) => t.state.info, bg: (t) => t.tileInfo, icon: 'infoCircle' },
  warn: { border: (t) => t.state.warn, bg: (t) => t.tileWarn, icon: 'exclamation' },
  err:  { border: (t) => t.state.err,  bg: (t) => t.tileErr,  icon: 'lock' },
};

export const Tile = ({ t, kind = 'info', icon, children }) => {
  const k = TILE[kind] || TILE.info;
  return (
    <View style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: R.card, borderWidth: 1,
      borderColor: k.border(t), backgroundColor: k.bg(t) }}>
      <Icon name={icon || k.icon} size={20} color={k.border(t)} />
      <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 14.5, lineHeight: 21, color: t.text2 }}>{children}</Text>
    </View>
  );
};

export const Empty = ({ t, icon, title, hint }) => (
  <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: t.border,
    borderRadius: R.card, padding: 20, alignItems: 'center', gap: S.md }}>
    <Icon name={icon} size={28} color={t.text3} />
    <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2, textAlign: 'center' }}>{title}</Text>
    {hint ? <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3, textAlign: 'center' }}>{hint}</Text> : null}
  </View>
);

// Paginação: acima de cinco itens
export const usePaged = (list, size = 5) => {
  const [page, setPage] = React.useState(0);
  const pages = Math.max(1, Math.ceil(list.length / size));
  const p = Math.min(page, pages - 1);
  return {
    slice: list.slice(p * size, p * size + size),
    paged: list.length > size,
    label: `${list.length} no total · ${p + 1} de ${pages}`,
    prev: p > 0 ? () => setPage(p - 1) : null,
    next: p < pages - 1 ? () => setPage(p + 1) : null,
  };
};

export const Pager = ({ t, pg }) => !pg.paged ? null : (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingTop: S.md }}>
    <Text style={{ flex: 1, fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>{pg.label}</Text>
    <Tap onPress={pg.prev} label="Página anterior"
      style={{ borderWidth: 1, borderColor: t.border, borderRadius: R.sm, opacity: pg.prev ? 1 : 0.35 }}>
      <Icon name="caretLeft" size={16} color={t.text3} />
    </Tap>
    <Tap onPress={pg.next} label="Página seguinte"
      style={{ borderWidth: 1, borderColor: t.border, borderRadius: R.sm, opacity: pg.next ? 1 : 0.35 }}>
      <Icon name="caretRight" size={16} color={t.text3} />
    </Tap>
  </View>
);
