import React, { useCallback, useMemo } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import {
  PosterCard,
  RankedCard,
  WideCard,
  ContinueCard,
  StackedPage,
  SpotlightCard,
} from "./HomeCards";

const GAP = 12;
const PAD = 20;
const POSTER_W = 124;

const keyOf = (item, i) => String(item?.imdbID ?? i);
const Gap = () => <View style={{ width: GAP }} />;

const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

const SectionHeader = React.memo(({ title, subtitle, colors }) => (
  <View style={styles.header}>
    <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
      {title}
    </Text>
    {!!subtitle && (
      <Text style={[styles.subtitle, { color: colors.text }]}>{subtitle}</Text>
    )}
  </View>
));
SectionHeader.displayName = "SectionHeader";

// Shared horizontal virtualized rail
const Rail = React.memo(({ data, renderItem, itemWidth, keyExtractor = keyOf }) => {
  const getItemLayout = useCallback(
    (_, index) => ({
      length: itemWidth + GAP,
      offset: PAD + (itemWidth + GAP) * index,
      index,
    }),
    [itemWidth],
  );
  const snap = itemWidth
    ? {
        getItemLayout,
        snapToInterval: itemWidth + GAP,
        snapToAlignment: "start",
        decelerationRate: "fast",
      }
    : null;

  return (
    <FlatList
      horizontal
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={Gap}
      contentContainerStyle={styles.railContent}
      showsHorizontalScrollIndicator={false}
      initialNumToRender={3}
      maxToRenderPerBatch={3}
      windowSize={5}
      removeClippedSubviews
      {...snap}
    />
  );
});
Rail.displayName = "Rail";

/* ───────── one component per layout so each keeps stable callbacks ───────── */

const PosterRail = React.memo(({ data, onOpen, colors }) => {
  const render = useCallback(
    ({ item }) => <PosterCard item={item} onPress={onOpen} colors={colors} width={POSTER_W} />,
    [onOpen, colors],
  );
  return <Rail data={data} renderItem={render} itemWidth={POSTER_W} />;
});
PosterRail.displayName = "PosterRail";

const RankedRail = React.memo(({ data, onOpen, colors }) => {
  const render = useCallback(
    ({ item, index }) => <RankedCard item={item} rank={index + 1} onPress={onOpen} colors={colors} />,
    [onOpen, colors],
  );
  return <Rail data={data} renderItem={render} />;
});
RankedRail.displayName = "RankedRail";

const WideRail = React.memo(({ data, onOpen, width }) => {
  const w = Math.min(Math.round(width * 0.72), 300);
  const render = useCallback(
    ({ item }) => <WideCard item={item} onPress={onOpen} width={w} />,
    [onOpen, w],
  );
  return <Rail data={data} renderItem={render} itemWidth={w} />;
});
WideRail.displayName = "WideRail";

const ContinueRail = React.memo(({ data, onOpen, colors, theme, width }) => {
  const w = Math.min(Math.round(width * 0.78), 320);
  const render = useCallback(
    ({ item }) => <ContinueCard item={item} onPress={onOpen} colors={colors} theme={theme} width={w} />,
    [onOpen, colors, theme, w],
  );
  return <Rail data={data} renderItem={render} itemWidth={w} />;
});
ContinueRail.displayName = "ContinueRail";

const StackedRail = React.memo(({ data, onOpen, colors, width }) => {
  const pageW = width - 56; // next page peeks in
  const pages = useMemo(() => chunk(data, 3).filter((p) => p.length === 3 || data.length < 3), [data]);
  const render = useCallback(
    ({ item }) => <StackedPage items={item} width={pageW} onPress={onOpen} colors={colors} />,
    [pageW, onOpen, colors],
  );
  return (
    <Rail
      data={pages}
      renderItem={render}
      itemWidth={pageW}
      keyExtractor={(page) => page[0].imdbID}
    />
  );
});
StackedRail.displayName = "StackedRail";

const SpotlightBlock = React.memo(({ data, onOpen, colors, width }) => {
  const rest = useMemo(() => data.slice(1), [data]);
  return (
    <>
      <View style={styles.spotWrap}>
        <SpotlightCard item={data[0]} onPress={onOpen} colors={colors} width={width - PAD * 2} />
      </View>
      {rest.length > 0 && (
        <View style={styles.spotRail}>
          <PosterRail data={rest} onOpen={onOpen} colors={colors} />
        </View>
      )}
    </>
  );
});
SpotlightBlock.displayName = "SpotlightBlock";

/* ───────── public section ───────── */

const HomeSection = ({ section, width, colors, theme, onOpen }) => {
  const { type, data } = section;
  let body = null;

  switch (type) {
    case "continue":
      body = <ContinueRail data={data} onOpen={onOpen} colors={colors} theme={theme} width={width} />;
      break;
    case "ranked":
      body = <RankedRail data={data} onOpen={onOpen} colors={colors} />;
      break;
    case "wide":
      body = <WideRail data={data} onOpen={onOpen} width={width} />;
      break;
    case "stacked":
      body = <StackedRail data={data} onOpen={onOpen} colors={colors} width={width} />;
      break;
    case "spotlight":
      body = <SpotlightBlock data={data} onOpen={onOpen} colors={colors} width={width} />;
      break;
    default:
      body = <PosterRail data={data} onOpen={onOpen} colors={colors} />;
  }

  return (
    <View style={styles.section}>
      <SectionHeader title={section.title} subtitle={section.subtitle} colors={colors} />
      {body}
    </View>
  );
};

export default React.memo(HomeSection);

const styles = StyleSheet.create({
  section: { marginBottom: 30 },
  header: { paddingHorizontal: PAD, marginBottom: 14, gap: 3 },
  title: { fontSize: 21, fontWeight: "700", letterSpacing: -0.3 },
  subtitle: { fontSize: 13, opacity: 0.6 },
  railContent: { paddingHorizontal: PAD },
  spotWrap: { paddingHorizontal: PAD },
  spotRail: { marginTop: 16 },
});