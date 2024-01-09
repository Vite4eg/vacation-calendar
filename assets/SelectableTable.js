BX.namespace('BX.SelectableTable');

(function (BX) {
    BX.SelectableTable = {
        name: 'SelectableTable',

        template: `
            <div
                @mouseleave="stopSelection"
                class="month-container"
            >
                <template v-if="headers.length > 0">
                    <div
                        v-for="header in headers"
                        class="month-container__cell"
                    >{{ header }}</div>
                </template>
            
                <div
                    v-for="(item, index) in items"
                    class="month-container__cell"
                    :class="{ selected: selected.has(item), 'select-none': startSelectionFromIndex !== null }"
                    @click="toggleSelected(item)"
                    @mousedown="mouseDownHandler(item)"
                    @mouseup="mouseUpHandler(item)"
                    @mouseenter="mouseEnterHandler(item, index)"
                >
                    <slot :item="item" :index="index"></slot>
                </div>
            </div>
        `,

        props: {
            headers: {
                type: Array,
                default () {
                    return [];
                }
            },

            items: Array,

            selected: {
                type: Set,
                default () {
                    return new Set();
                }
            },
        },

        data () {
            return {
                previousSelected: [],
                startSelectionFromIndex: null,
                selectionAction: false, // Вид действия при массовом выделении - select | unselect
            }
        },

        methods: {
            toggleSelected (item) {
                this.$emit('toggleSelected', item);
            },

            mouseDownHandler (item) {
                this.startSelectionFromIndex = this.items.indexOf(item);
                this.previousSelected = Array.from(this.selected);
                this.selectionAction = this.selected.has(item) ? 'unselect' : 'select';
            },

            mouseUpHandler (item) {
                this.stopSelection();
            },

            mouseEnterHandler (item, index) {
                if (this.startSelectionFromIndex === null) {
                    return;
                }

                const minIndex = Math.min(this.startSelectionFromIndex, index);
                const maxIndex = Math.max(this.startSelectionFromIndex, index);

                const selected = new Set(this.previousSelected);
                for (let i = minIndex; i <= maxIndex; i++) {
                    if (this.selectionAction === 'select') {
                        selected.add(this.items[i]);
                        // при выделении мышкой если зацепили выделенный ранее элемент, а потом ушли с него в сторону уменьшения периода - снять выделение
                        this.previousSelected = this.previousSelected.filter(prevSelectedItem => prevSelectedItem !== this.items[i]);
                    } else {
                        selected.delete(this.items[i]);
                    }
                }
                this.$emit('updateSelected', selected);
            },

            stopSelection () {
                this.startSelectionFromIndex = null;
                this.selectionAction = false;
                this.previousSelected = [];
            },
        },
    };
})(BX);
