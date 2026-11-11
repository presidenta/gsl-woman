import { h } from '../../core/dom.js';
import { t } from '../../core/i18n.js';
import { LEVELS } from '../../config.js';
import * as journal from '../../journal/journal.js';
import { segmented, field, choiceList } from '../../ui/controls.js';
import { openSheet, closeSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';

/* ФОРМА ЗАПИСИ — нижний лист. Одна форма на все случаи:
   - задание дня: уровень + четыре вопроса (что получилось, с каким мужчиной, что произошло, как);
   - свободный поток: то же плюс выбор, какое из упражнений недели делала;
   - седьмой день: «главное за неделю» и «что обсудить на созвоне», без уровня.
   Новая запись и правка старой — одна и та же форма (entry передан — правка). */

/**
 * @param {object} p
 * @param {number} p.day — день программы
 * @param {'task'|'flow'|'call'} p.kind
 * @param {Array<{title:string}>} [p.exercises] — упражнения недели для свободного потока
 * @param {object} [p.levels] — свои подписи уровней задания
 * @param {object} [p.entry] — запись для правки
 */
export function openEntry({ day, kind, exercises = [], levels = null, entry = null }) {
  const draft = {
    level: entry?.level || 'full',
    exercise: entry ? entry.exercise : exercises.length ? 0 : null,
  };

  const parts = [];

  if (kind !== 'call') {
    const hints = {};
    for (const l of LEVELS) hints[l] = levels?.[l] || t(`levels.hint.${l}`);
    parts.push(h('div', { class: 'field' },
      h('span', { class: 'field__label' }, t('entry.level')),
      segmented({
        label: t('entry.level'),
        options: LEVELS.map((l) => ({ value: l, label: t(`levels.${l}`) })),
        value: draft.level,
        hints,
        onChange: (v) => { draft.level = v; },
      }),
    ));
  }

  if (kind === 'flow' && exercises.length) {
    parts.push(h('div', { class: 'field' },
      h('span', { class: 'field__label' }, t('entry.exercise')),
      choiceList({
        label: t('entry.exercise'),
        options: exercises.map((ex, i) => ({ value: i, label: ex.title })),
        value: draft.exercise,
        onChange: (v) => { draft.exercise = v; },
      }),
    ));
  }

  const isCall = kind === 'call';
  const questions = isCall
    ? [['worked', 'callWorked', 'callWorkedPh'], ['happened', 'callHappened', 'callHappenedPh']]
    : [['worked', 'worked', 'workedPh'], ['man', 'man', 'manPh'], ['happened', 'happened', 'happenedPh'], ['how', 'how', 'howPh']];

  const controls = {};
  for (const [key, label, ph] of questions) {
    const f = field({
      label: t(`entry.${label}`),
      placeholder: t(`entry.${ph}`),
      multiline: key !== 'man',
      rows: 3,
      maxlength: key === 'man' ? 120 : 2000,
      value: entry?.[key] || '',
    });
    controls[key] = f.control;
    parts.push(f.node);
  }

  const save = h('button', { type: 'button', class: 'btn btn--gold btn--block' }, t('common.save'));
  save.addEventListener('click', () => {
    const fields = {};
    for (const key of Object.keys(controls)) fields[key] = controls[key].value;
    const level = isCall ? 'full' : draft.level;
    if (entry) journal.update(entry.id, { ...fields, level, exercise: draft.exercise });
    else journal.add({ day, kind, exercise: kind === 'flow' ? draft.exercise : null, level, ...fields });
    closeSheet();
    toast({ title: t('entry.saved') });
  });

  const actions = h('div', { class: 'stack', style: { marginTop: 'var(--sp-5)' } }, save);
  if (entry) {
    const del = h('button', { type: 'button', class: 'btn btn--danger btn--block' }, t('common.delete'));
    del.addEventListener('click', () => {
      if (!confirm(t('entry.deleteConfirm'))) return;
      journal.remove(entry.id);
      closeSheet();
      toast({ title: t('entry.deleted') });
    });
    actions.append(del);
  }

  const content = h('div', {},
    h('p', { class: 'caps', style: { marginBottom: 'var(--sp-4)' } }, t('entry.forDay', { day })),
    ...parts,
    actions,
    h('p', { class: 'field__hint', style: { marginTop: 'var(--sp-4)', textAlign: 'center' } }, t('entry.private')),
  );

  openSheet({ title: entry ? t('entry.titleEdit') : t('entry.titleNew'), content });
}
