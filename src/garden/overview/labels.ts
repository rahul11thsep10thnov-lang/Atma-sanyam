// The Garden overview's and focus statistics' words in the person's language:
// month and weekday names for the charts, and minutes / hours.
import { getLanguage, t } from '../../i18n';
import { EN_NAMES, Names } from './stats';

const HI_NAMES: Names = {
  months: ['जन', 'फ़र', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुला', 'अग', 'सित', 'अक्टू', 'नव', 'दिस'],
  monthsLong: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
  weekdays: ['सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि', 'रवि'],
  weekdaysLong: ['सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार', 'रविवार'],
};

export function names(): Names {
  return getLanguage() === 'hi' ? HI_NAMES : EN_NAMES;
}

/** "45 min", "2 h", "2 h 15 min" (or the Hindi equivalents). */
export function fmtMinutes(m: number): string {
  const r = Math.round(m);
  if (r < 60) return t('unit.min', { n: r });
  const h = Math.floor(r / 60);
  const mm = r % 60;
  return mm ? t('unit.hmin', { h, m: mm }) : t('unit.h', { n: h });
}

/** A short axis label: "30m", "2h". */
export function fmtShort(m: number): string {
  const r = Math.round(m);
  if (r < 60) return t('unit.minShort', { n: r });
  return t('unit.hShort', { n: Math.round((r / 60) * 10) / 10 });
}

/** "3 plants", "1 plant". */
export function countOf(n: number, one: 'gov.plant' | 'gov.tree', many: 'gov.plants' | 'gov.trees'): string {
  return `${n} ${t(n === 1 ? one : many)}`;
}
