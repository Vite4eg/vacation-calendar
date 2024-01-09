BX.namespace('BX.VacationPlanning');

(function (BX) {
    const param = {
        name: 'Планирование отпусков',

        components: {
            SelectableTable: BX.SelectableTable,
        },

        template: `
            <div class="vacation-calendar">
                <div class="vacation-calendar__filters">
                    <select v-model="year">
                        <option
                            v-for="year in years"
                            :value="year"
                        >{{ year }}</option>
                    </select>

                    <select v-model="month">
                        <option
                            v-for="currentMonth in monthRange"
                            :value="currentMonth"
                        >{{ format(firstDayOfMonth(currentMonth), formats.monthNumber) }}</option>
                    </select>
                </div>

                <div>
                    <div class="vacation-calendar__month-header">
                        <div class="vacation-calendar__month-header-left" :title="format(firstDayOfPrevMonth, formats.monthHeader)">
                            <button @click="goPreviousMonth" type="button">&#9668;</button>
                        </div>
                        <div class="vacation-calendar__month-header-center">
                            {{ format(firstDayOfSelectedMonth, formats.monthHeader) }}
                        </div>
                        <div class="vacation-calendar__month-header-right" :title="format(firstDayOfNextMonth, formats.monthHeader)">
                            <button @click="goNextMonth" type="button">&#9658;</button>
                        </div>
                    </div>
                    <SelectableTable
                        v-slot="slotProps"
                        :items="timestampsOfMonth"
                        :headers="days"
                        :selected="selected"
                        @toggle-selected="toggleSelected"
                        @update-selected="updateSelected"
                    >
                        {{ format(new Date(slotProps.item), formats.table) }}
                    </SelectableTable>
                </div>

                <div>
                    <p>Выбрано дней: {{ selected.size }}</p>
                </div>

                <div>
                    <template v-if="ranges.length > 0">
                        Выбранные периоды:
                        <div class="vacation-calendar__ranges">
                            <div
                                v-for="range in ranges"
                                @click="goYear(range.start)"
                                class="vacation-calendar__range"
                                title="Перейти к периоду"
                            >
                                {{ format(new Date(range.start), formats.ranges) }} - {{ format(new Date(range.end), formats.ranges) }}
                                <span
                                    class="vacation-calendar__range-badge"
                                    title="Количество выбранных дней"
                                >{{ range.count }}</span>
                                <button
                                    @click="deleteRange(range)"
                                    class="vacation-calendar__range-close"
                                    title="Удалить период"
                                >&times;</button>
                            </div>
                        </div>
                    </template>
                    <template v-else>Не выбрано ни одного периода</template>
                </div>
            </div>
        `,

        data () {
            return {
                yearRange: [2010, 2030],
                month: 0,
                year: 2024,
                days: ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'],
                items,

                selected: new Set(),

                // форматы для использования в Date.toLocaleString
                formats: {
                    default:     { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
                    monthHeader: { month: 'long', year: 'numeric' },
                    ranges:      { day: 'numeric', month: '2-digit', year: 'numeric' },
                    table:       { month: 'short', day: 'numeric' },
                    monthNumber: { month: 'long' }
                }
            }
        },

        computed: {
            /**
             * Хранить даты в виде Date не получится - объекты пересоздаются, ломаются привязки
             *
             * Будем хранить даты в виде timestamp, Date использовать только для показа
             *
             * @returns {*[]}
             */
            daysOfMonth () {
                let result = [];

                const firstDayNumber = this.firstDayOfSelectedMonth.getDay();
                for (let i = firstDayNumber; i > 1; i--) {
                    result.push(new Date(
                        this.firstDayOfSelectedMonth.getFullYear(),
                        this.firstDayOfSelectedMonth.getMonth(),
                        1 - i
                    ));
                }

                for (let date = new Date(this.firstDayOfSelectedMonth); date < this.firstDayOfNextMonth; date.setDate(date.getDate() + 1)) {
                    result.push(new Date(date));
                }

                const pad = Math.ceil(result.length / 7) * 7 - result.length;
                const currentDay = result[result.length - 1];
                for (let i = 1; i <= pad; i++) {
                    result.push(new Date(
                        currentDay.getFullYear(),
                        currentDay.getMonth(),
                        currentDay.getDate() + i
                    ));
                }

                return result;
            },

            timestampsOfMonth () {
                return this.daysOfMonth.map(date => date.getTime());
            },

            years () {
                let result = [];
                for (let i = this.yearRange[0]; i <= this.yearRange[1]; i++) {
                    result.push(i);
                }

                return result;
            },

            monthRange () {
                let result = [];
                for (let i = 0; i < 12; i++) {
                    result.push(i);
                }

                return result;
            },

            firstDayOfSelectedMonth () {
                return new Date(this.year, this.month, 1);
            },

            /**
             * Если передать в new Date 0 в качестве дня - возьмётся предыдущий
             */
            lastDayOfSelectedMonth () {
                return new Date(
                    this.firstDayOfSelectedMonth.getFullYear(),
                    this.firstDayOfSelectedMonth.getMonth() + 1,
                    0
                );
            },

            /**
             * Первый день следующего месяца
             *
             * @returns {Date}
             */
            firstDayOfNextMonth () {
                return new Date(
                    this.firstDayOfSelectedMonth.getFullYear(),
                    this.firstDayOfSelectedMonth.getMonth() + 1,
                    1
                );
            },

            /**
             * Первый день предыдущего месяца
             *
             * @returns {Date}
             */
            firstDayOfPrevMonth () {
                return new Date(
                    this.firstDayOfSelectedMonth.getFullYear(),
                    this.firstDayOfSelectedMonth.getMonth() - 1,
                    1
                );
            },


            /**
             * Выбранные даты, объединённые в периоды.
             *
             * range - объект с ключами start, end, count
             *
             * Период - следующие друг за другом даты-дни.
             */
            ranges () {
                if (this.selected.size === 0) {
                    return [];
                }

                // две последовательные даты входят в один период если разница между ними не более 2 дней.
                const twoDaysDuration = 1000 * 3600 * 24 * 2;  // два дня в миллисекундах
                let selected = Array.from(this.selected).sort();
                let ranges = [];
                let previousTimestamp = null;
                let range = {};
                ranges.push(range);
                selected.forEach(timestamp => {
                    if (previousTimestamp === null) {
                        range.start = timestamp;
                        range.end = timestamp;
                        range.count = 1;
                        previousTimestamp = timestamp;

                        return;
                    }

                    const diff = timestamp - previousTimestamp;
                    if (diff < twoDaysDuration) {
                        range.end = timestamp;
                        range.count++;
                    } else {
                        range = { start: timestamp, end: timestamp, count: 1 };
                        ranges.push(range);
                    }
                    previousTimestamp = timestamp;
                });

                return ranges;
            },
        },

        methods: {
            /**
             * @link https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat
             *
             * @param {Date}    date
             * @param {Object}  format
             * @param {String}  nullValueDefault Значение для показа если date=null
             * @returns {string}
             */
            format(date, format, nullValueDefault = '') {
                if (date === null) {
                    return nullValueDefault;
                }

                return date.toLocaleDateString('ru-RU', format);
            },

            toggleSelected (item) {
                if (this.selected.has(item)) {
                    this.selected.delete(item);
                } else {
                    this.selected.add(item);
                }
            },

            updateSelected (selected) {
                this.selected = selected;
            },

            /**
             * Переключиться на год/месяц периода
             */
            goYear (timestamp) {
                const date = new Date(timestamp);
                this.year = date.getFullYear();
                this.month = date.getMonth();
            },

            goPreviousMonth () {
                this.year = this.firstDayOfPrevMonth.getFullYear();
                this.month = this.firstDayOfPrevMonth.getMonth();
            },

            goNextMonth () {
                this.year = this.firstDayOfNextMonth.getFullYear();
                this.month = this.firstDayOfNextMonth.getMonth();

            },

            firstDayOfMonth (monthNumber) {
                const date = new Date();
                date.setMonth(monthNumber);

                return date;
            },

            deleteRange (range) {
                const selected = Array.from(this.selected).sort();
                const startIndex = selected.indexOf(range.start);
                const endIndex = selected.indexOf(range.end);
                for (let i = startIndex; i <= endIndex; i++) {
                    if (this.selected.has(selected[i])) {
                        this.selected.delete(selected[i]);
                    }
                }
            },
        },
    };

    BX.VacationPlanning = BX.BitrixVue.createApp(param);
})(BX);
