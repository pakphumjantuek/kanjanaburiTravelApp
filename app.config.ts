export default {
  expo: {
    ios: {
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
        },
      },
    },
    extra: {
      API_BASE_URL: "http://10.103.0.17/cs67/reactnative/boat/api",
      BASE_URL: "http://10.103.0.17/cs67/reactnative/boat",
    },
  },
};
