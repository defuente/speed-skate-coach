import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { Session } from '@/types/training';
import { getSessions } from '@/utils/storage';
import { formatTime, formatDateShort, calculateStats } from '@/utils/calculations';

export default function StatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => { getSessions().then(data => { setSessions(data); setLoading(false); }); }, []));
  const webTop = Platform.OS === 'web' ? 67 : 0;
  const webBottom = Platform.OS === 'web' ? 84 : 0;

  if (loading) return <View style={[styles.container,{backgroundColor:colors.background}]}><View style={styles.centered}><ActivityIndicator color={colors.primary} size="large" /></View></View>;

  const PageHeader = <View style={[styles.pageHeader,{paddingTop:insets.top+webTop+16,borderBottomColor:colors.border}]}><Text style={[styles.pageTitle,{color:colors.foreground}]}>Estadísticas</Text><Text style={[styles.pageSub,{color:colors.mutedForeground}]}>{sessions.length} sesiones</Text></View>;
  if (!sessions.length) return <View style={[styles.container,{backgroundColor:colors.background}]}>{PageHeader}<View style={styles.empty}><Ionicons name="bar-chart-outline" size={56} color={colors.mutedForeground}/><Text style={[styles.emptyTitle,{color:colors.foreground}]}>Sin datos aún</Text><Text style={[styles.emptySub,{color:colors.mutedForeground}]}>Completa entrenamientos para ver tu evolución</Text></View></View>;

  const last10=sessions.slice(0,10).reverse(); const allLaps=sessions.flatMap(s=>s.laps); const totalTime=sessions.reduce((a,s)=>a+s.totalTime,0); const bestLapEver=allLaps.length?allLaps.reduce((a,b)=>a.lapTime<b.lapTime?a:b):null; const allSpeeds=sessions.flatMap(s=>s.laps.map(l=>l.speed??0)).filter(v=>v>0); const maxSpeed=allSpeeds.length?Math.max(...allSpeeds):0;
  const bestSessions=last10.filter(s=>s.laps.length); const bestLapChartData=bestSessions.map(s=>calculateStats(s.laps,s.distancePerLap).bestLap?.lapTime??0); const bestLapLabels=bestSessions.map(s=>formatDateShort(s.date));
  const speedSessions=last10.filter(s=>s.distancePerLap>0&&s.laps.length); const speedData=speedSessions.map(s=>calculateStats(s.laps,s.distancePerLap).averageSpeed); const speedLabels=speedSessions.map(s=>formatDateShort(s.date));
  const lapCountData=last10.map(s=>s.laps.length); const lapCountLabels=last10.map(s=>formatDateShort(s.date));
  const consistSessions=last10.filter(s=>s.laps.length>1); const consistData=consistSessions.map(s=>calculateStats(s.laps,s.distancePerLap).consistency); const consistLabels=consistSessions.map(s=>formatDateShort(s.date));

  return <View style={[styles.container,{backgroundColor:colors.background}]}>{PageHeader}<ScrollView contentContainerStyle={[styles.scroll,{paddingBottom:insets.bottom+webBottom+28}]} showsVerticalScrollIndicator={false}>
    <View style={styles.grid2}><SummaryCard icon="layers-outline" label="Total sesiones" value={String(sessions.length)} colors={colors}/><SummaryCard icon="flag-outline" label="Total vueltas" value={String(allLaps.length)} colors={colors}/></View>
    <View style={styles.grid2}><SummaryCard icon="time-outline" label="Tiempo total" value={formatTime(totalTime)} colors={colors}/>{bestLapEver?<SummaryCard icon="trophy-outline" label="Mejor vuelta" value={formatTime(bestLapEver.lapTime)} colors={colors} accent={colors.lapBest}/>:<SummaryCard icon="analytics-outline" label="Sesiones" value={String(sessions.length)} colors={colors}/>}</View>
    {maxSpeed>0&&<SummaryCard icon="speedometer-outline" label="Velocidad máx. registrada" value={`${maxSpeed.toFixed(1)} km/h`} colors={colors} accent={colors.primary} wide/>}
    {bestLapChartData.length>1&&<ChartSection title="Mejor vuelta por sesión" subtitle="Tiempo · Menos es mejor" colors={colors}><SimpleBarChart data={bestLapChartData} labels={bestLapLabels} inverted colors={colors} formatValue={formatTime}/></ChartSection>}
    {speedData.length>1&&<ChartSection title="Velocidad media" subtitle="km/h por sesión" colors={colors}><SimpleBarChart data={speedData} labels={speedLabels} colors={colors} formatValue={v=>`${v.toFixed(1)}`}/></ChartSection>}
    {lapCountData.length>1&&<ChartSection title="Vueltas por sesión" subtitle="Últimas 10 sesiones" colors={colors}><SimpleBarChart data={lapCountData} labels={lapCountLabels} colors={colors} formatValue={v=>String(Math.round(v))}/></ChartSection>}
    {consistData.length>1&&<ChartSection title="Consistencia" subtitle="% de variación · Menos es más regular" colors={colors}><SimpleBarChart data={consistData} labels={consistLabels} inverted colors={colors} formatValue={v=>`${v.toFixed(1)}%`}/></ChartSection>}
  </ScrollView></View>;
}

function SummaryCard({icon,label,value,colors,accent,wide}:any){return <View style={[styles.summaryCard,{backgroundColor:colors.card,borderColor:colors.border,flex:wide?0:1}]}><Ionicons name={icon} size={21} color={accent??colors.primary}/><Text style={[styles.summaryVal,{color:accent??colors.foreground}]}>{value}</Text><Text style={[styles.summaryLbl,{color:colors.mutedForeground}]}>{label}</Text></View>}
function ChartSection({title,subtitle,children,colors}:any){return <View style={[styles.chartCard,{backgroundColor:colors.card,borderColor:colors.border}]}><Text style={[styles.chartTitle,{color:colors.foreground}]}>{title}</Text><Text style={[styles.chartSub,{color:colors.mutedForeground}]}>{subtitle}</Text><View style={styles.chartBody}>{children}</View></View>}
function SimpleBarChart({data,labels,inverted=false,colors,formatValue}:{data:number[];labels:string[];inverted?:boolean;colors:ReturnType<typeof useColors>;formatValue:(v:number)=>string}){
  if(!data.length)return null; const min=Math.min(...data),max=Math.max(...data),range=max-min||1,MAX_H=150,MIN_H=28;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}><View style={styles.barsRow}>{data.map((val,i)=>{const normalized=(val-min)/range; const barH=inverted?MAX_H-normalized*(MAX_H-MIN_H):MIN_H+normalized*(MAX_H-MIN_H); const highlight=inverted?val===min:val===max; return <View key={`${labels[i]}-${i}`} style={styles.barCol}><Text style={[styles.barVal,{color:highlight?colors.primary:colors.foreground}]}>{formatValue(val)}</Text><View style={styles.barTrack}><View style={[styles.bar,{height:barH,backgroundColor:highlight?colors.primary:`${colors.primary}70`}]}/></View><Text style={[styles.barLbl,{color:colors.mutedForeground}]}>{labels[i]}</Text></View>})}</View></ScrollView>
}
const styles=StyleSheet.create({container:{flex:1},centered:{flex:1,alignItems:'center',justifyContent:'center'},empty:{flex:1,alignItems:'center',justifyContent:'center',gap:10,paddingHorizontal:40},emptyTitle:{fontSize:18,fontFamily:'Inter_600SemiBold'},emptySub:{fontSize:14,fontFamily:'Inter_400Regular',textAlign:'center'},pageHeader:{paddingHorizontal:20,paddingBottom:14,borderBottomWidth:StyleSheet.hairlineWidth,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'},pageTitle:{fontSize:28,fontFamily:'Inter_700Bold'},pageSub:{fontSize:13,fontFamily:'Inter_400Regular',marginBottom:3},scroll:{padding:16,gap:14},grid2:{flexDirection:'row',gap:12},summaryCard:{padding:16,borderRadius:14,borderWidth:StyleSheet.hairlineWidth,gap:5},summaryVal:{fontSize:22,fontFamily:'Inter_700Bold',fontVariant:['tabular-nums']},summaryLbl:{fontSize:12,fontFamily:'Inter_400Regular'},chartCard:{borderRadius:14,borderWidth:StyleSheet.hairlineWidth,padding:16,gap:4},chartTitle:{fontSize:18,fontFamily:'Inter_700Bold'},chartSub:{fontSize:12,fontFamily:'Inter_400Regular'},chartBody:{marginTop:14},chartScroll:{paddingRight:8},barsRow:{flexDirection:'row',gap:10,alignItems:'flex-end'},barCol:{width:62,alignItems:'center',gap:7},barVal:{fontSize:12,fontFamily:'Inter_600SemiBold',textAlign:'center',fontVariant:['tabular-nums']},barTrack:{height:150,width:42,justifyContent:'flex-end'},bar:{width:'100%',borderRadius:6},barLbl:{fontSize:10,fontFamily:'Inter_500Medium',textAlign:'center'}});
