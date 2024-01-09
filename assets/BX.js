window.BX = {
    namespace (path) {
        let keys = path.split('.');
        if (keys[0] === 'BX') {
            keys.shift();
        }
        let current = window.BX;
        let key;
        while (key = keys.shift()) {
            current = current[key] = {};
        }
    },

    BitrixVue: {
        createApp (params) {
            return Vue.createApp(params);
        }
    },
};
