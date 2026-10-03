function FoodItem({
  item,
  quantity,
  onAdd,
  onRemove,
}) {
  return (
    <div className="food-item">
      <div className="food-item-image">
        <img
          src={item.image}
          alt={item.name}
          onError={(event) => {
            event.currentTarget.src =
              "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80";
          }}
        />
      </div>

      <div className="food-item-content">
        <div className="food-item-top">
          <div>
            <h3>{item.name}</h3>

            <p className="food-description">
              {item.description}
            </p>
          </div>

          <span
            className={
              item.veg
                ? "veg-indicator veg"
                : "veg-indicator non-veg"
            }
          >
            {item.veg ? "●" : "●"}
          </span>
        </div>

        <div className="food-item-bottom">
          <strong>
            ₹{Number(item.price).toFixed(0)}
          </strong>

          {quantity === 0 ? (
            <button
              className="add-food-btn"
              onClick={onAdd}
            >
              ADD
            </button>
          ) : (
            <div className="quantity-control">
              <button onClick={onRemove}>
                −
              </button>

              <span>{quantity}</span>

              <button onClick={onAdd}>
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FoodItem;