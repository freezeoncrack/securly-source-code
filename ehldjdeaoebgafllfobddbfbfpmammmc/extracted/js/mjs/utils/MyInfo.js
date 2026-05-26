var INSTANCE;

function MyInfo(info) {
  if (!(this instanceof MyInfo)) {
    return new MyInfo(info);
  }
  this.info = info;
}


export default {
  init: function (info) {
    if (!INSTANCE) {
      INSTANCE = new MyInfo(info);
    } else {
      INSTANCE.info = info;
    }
    return INSTANCE;
  },
  //this must be called after an init
  getInstance: function () {
    if (!INSTANCE) {
      return this.init.apply(this, arguments);
    }
    return INSTANCE;
  }
};
