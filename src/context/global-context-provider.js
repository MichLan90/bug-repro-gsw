import React from "react";
import PropTypes from "prop-types";

const initialState = {
  cartRevision: 0,
  cartExternalRevision: -1,
  cartSyncInProgress: false,
  cart: [],
  user: null,
  isLoggedIn: undefined,
  userRefresh: 0,
  pageCache: {},
  products: [],
};

const isSameProduct = (a, b) => {
  if (a.id !== b.id) {
    return false;
  }
  const attributesA = JSON.stringify(
    a.attributes,
    a.attributes ? Object.keys(a.attributes).sort() : undefined
  );
  const attributesB = JSON.stringify(
    b.attributes,
    b.attributes ? Object.keys(b.attributes).sort() : undefined
  );
  if (attributesA !== attributesB) {
    return false;
  }
  return true;
};

const reducer = (state, action) => {
  switch (action.type) {
    case "ADD_TO_CART": {
      const newProduct = action.value;
      const alreadyInCart =
        state.cart.find((product) => isSameProduct(product, newProduct)) !==
        undefined;
      if (alreadyInCart) {
        return {
          ...state,
          cartRevision: state.cartRevision + 1,
          cart: state.cart.map((product) =>
            isSameProduct(product, newProduct)
              ? { ...product, quantity: product.quantity + newProduct.quantity }
              : product
          ),
        };
      } else {
        return {
          ...state,
          cartRevision: state.cartRevision + 1,
          cart: [
            ...state.cart,
            { ...newProduct, quantity: newProduct.quantity },
          ],
        };
      }
    }
    case "INCREASE_QUANTITY_IN_CART": {
      const newProduct = action.value;
      return {
        ...state,
        cartRevision: state.cartRevision + 1,
        cart: state.cart.map((product) =>
          isSameProduct(product, newProduct)
            ? { ...product, quantity: product.quantity + 1 }
            : product
        ),
      };
    }
    case "REMOVE_FROM_CART": {
      const oldProduct = action.value;
      return {
        ...state,
        cartRevision: state.cartRevision + 1,
        cart: state.cart
          .map((product) =>
            isSameProduct(product, oldProduct)
              ? { ...product, quantity: product.quantity - 1 }
              : product
          )
          .filter((product) => product.quantity > 0),
      };
    }
    case "UPDATE_CART": {
      if (action.value.length === 0) {
        window.localStorage.removeItem("woo-session");
        window.localStorage.removeItem("local_cart");
      }
      return {
        ...state,
        cartRevision: state.cartRevision + 1,
        cart: action.value,
      };
    }
    case "SYNC_CART": {
      return {
        ...state,
        cartSyncInProgress: action.cartSyncInProgress,
        cartExternalRevision: action.cartExternalRevision,
      };
    }
    case "SET_USER": {
      return {
        ...state,
        user: action.value,
        isLoggedIn: action.value?.nicename !== undefined,
      };
    }
    case "CHECK_USER": {
      return {
        ...state,
        userRefresh: state.userRefresh + 1,
      };
    }
    case "CACHE_PAGE": {
      const newState = { ...state };
      newState.pageCache[action.uri] = action.data;
      return newState;
    }
    case "UPDATE_PRODUCTS": {
      const products = action.value;
      return {
        ...state,
        products: [...products],
      };
    }
    default:
      throw new Error(`Invalid action: ${action.type}`);
  }
};

export const GlobalStateContext = React.createContext();
export const GlobalDispatchContext = React.createContext();

const GlobalContextProvider = ({ children }) => {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  React.useEffect(() => {
    const cart = JSON.parse(localStorage.getItem("local_cart") || "[]");
    if (Array.isArray(cart)) {
      dispatch({
        type: "UPDATE_CART",
        value: cart,
      });
    }
  }, []);

  React.useEffect(() => {
    if (state.cartRevision > 0) {
      localStorage.setItem("local_cart", JSON.stringify(state.cart));
    }
  }, [state.cartRevision]);

  return (
    <GlobalStateContext.Provider value={state}>
      <GlobalDispatchContext.Provider value={dispatch}>
        {children}
      </GlobalDispatchContext.Provider>
    </GlobalStateContext.Provider>
  );
};

GlobalContextProvider.propTypes = {
  children: PropTypes.node,
};

export default GlobalContextProvider;
