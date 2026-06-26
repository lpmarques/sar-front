function EditControl(props) {
  const context = useLeafletContext();
  const drawRef = useRef(null);
  const handlersRef = useRef({});

  const onDrawCreate = useCallback((e) => {
    const { onCreated } = props;
    const container = context.layerContainer || context.map;
    container.addLayer(e.layer);
    onCreated?.(e);
  }, [context, props.onCreated]);

  // Main effect for control setup
  useEffect(() => {
    const { map } = context;
    if (!map || !L.Control.Draw) return; // Safety check

    // Clear previous handlers
    Object.entries(handlersRef.current).forEach(([key, handler]) => {
      map.off(eventHandlers[key], handler);
    });

    // Setup new handlers
    const newHandlers = {};
    Object.keys(eventHandlers).forEach((key) => {
      if (props[key]) {
        const handler = (e) => props[key](e);
        newHandlers[key] = handler;
        map.on(eventHandlers[key], handler);
      }
    });
    handlersRef.current = newHandlers;

    map.on(L.Draw.Event.CREATED, onDrawCreate);
    
    drawRef.current = new L.Control.Draw(createDrawOptions(props, context));
    map.addControl(drawRef.current);
    props.onMounted?.(drawRef.current);

    return () => {
      map.off(L.Draw.Event.CREATED, onDrawCreate);
      Object.entries(handlersRef.current).forEach(([key, handler]) => {
        map.off(eventHandlers[key], handler);
      });
      drawRef.current?.remove();
    };
  }, [context, onDrawCreate]);

  // Effect for draw options changes
  useEffect(() => {
    const { map } = context;
    if (!map || !drawRef.current) return;

    const prevOptions = drawRef.current.options;
    const newOptions = createDrawOptions(props, context);

    if (!isEqual(prevOptions, newOptions)) {
      drawRef.current.remove();
      drawRef.current = new L.Control.Draw(newOptions);
      map.addControl(drawRef.current);
    }
  }, [props.draw, props.edit, props.position]);

  return null;
}