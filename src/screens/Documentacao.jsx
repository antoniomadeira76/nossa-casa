import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { Card, SectionTitle, Empty } from '../ui';
import Icon from '../Icon';

export default function Documentacao({ t, onClose }) {
  const { s } = useStore();
  const [expanded, setExpanded] = useState(null);

  const changelog = (s.registo || []).slice(0, 50);

  // Group by date
  const byDate = {};
  changelog.forEach(entry => {
    const dateKey = typeof entry.at === 'number'
      ? new Date(entry.at).toLocaleDateString('pt-PT')
      : entry.at;
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(entry);
  });

  return (
    <>
      <View style={{ gap: S.md }}>
        <Text style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: '500', color: t.text2 }}>
          Registo de Alterações
        </Text>
        <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: t.text3 }}>
          Histórico de modificações na casa, ordenado por data descendente.
        </Text>
      </View>

      {changelog.length === 0 ? (
        <Empty t={t} icon="calendar" title="Sem alterações registadas." hint="Começarão a aparecer aqui quando modificar a casa." />
      ) : (
        Object.keys(byDate)
          .sort()
          .reverse()
          .map(date => (
            <View key={date}>
              <SectionTitle t={t}>{date}</SectionTitle>
              <View style={{ gap: S.md }}>
                {byDate[date].map((entry, i) => (
                  <Card key={i} t={t}>
                    <View style={{ gap: S.sm, minHeight: 44, flexDirection: 'row', alignItems: 'center' }}>
                      <Icon name="infoCircle" size={20} color={t.text3} />
                      <Text style={{ flex: 1, fontFamily: FONT.ui, fontSize: 13, color: t.text2 }}>
                        {entry.t || 'Alteração'}
                      </Text>
                      <Text style={{ fontFamily: FONT.ui, fontSize: 11, color: t.text3 }}>
                        {typeof entry.at === 'number' ? new Date(entry.at).toLocaleTimeString('pt-PT') : ''}
                      </Text>
                    </View>
                  </Card>
                ))}
              </View>
            </View>
          ))
      )}

    </>
  );
}
