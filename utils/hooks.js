import { useState, useEffect } from "react";

function setAt(obj, path, val) {
  let clone = JSON.parse(JSON.stringify(obj));
  const output = clone;
  path.forEach((p, idx) => {
    if (idx === (path.length - 1)) {
      clone[p] = val;
    } else {
      if (!clone[p]) { clone[p] = {} }
      clone = clone[p]
    }
  })
  return output;
}

function getAt(obj, path) {
  return path.reduce((res, p) => res = res[p], obj)
}

const storage = {
  getItemAt(keys, initialValue) {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const [head, tail] = [keys[0], keys.slice(1)];
      const unparsedValue = window.localStorage[head];
      if (typeof unparsedValue === "undefined") {
        return initialValue;
      }
      return getAt(JSON.parse(unparsedValue), tail);
    } catch (error) {
      return initialValue;
    }
  },

  setItemAt(keys, value) {
    const [head, tail] = [keys[0], keys.slice(1)];
    const unparsedValue = window.localStorage[head]
    const oldVal = unparsedValue ? JSON.parse(unparsedValue) : {};
    const newVal = JSON.stringify(setAt(oldVal, tail, value));
    window.localStorage[head] = newVal;
  },
};

export function useLocalStorageAt(initialKeys, initialValue) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    let data = storage.getItemAt(initialKeys);
    if (!data) {
      data = storage.setItemAt(initialKeys, initialValue)
    }
    setValue(data);
  }, []);

  const setItem = (setKeys, newValue) => {
    storage.setItemAt(setKeys, newValue);
    setValue(storage.getItemAt(initialKeys));
  };

  return [value, setItem];
}
