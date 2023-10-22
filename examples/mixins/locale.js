import { t } from "examples/locale";

export default {
  methods: {
    t(...args) {
      return t.apply(this, args);
    },
  },
};
