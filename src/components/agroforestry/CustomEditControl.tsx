import isEqual from 'fast-deep-equal';
import React, { useRef } from 'react';
import { useLeafletContext } from '@react-leaflet/core';
import leaflet from 'leaflet';

const eventHandlers = {
  onEdited: 'draw:edited',
  onDrawStart: 'draw:drawstart',
  onDrawStop: 'draw:drawstop',
  onDrawVertex: 'draw:drawvertex',
  onEditStart: 'draw:editstart',
  onEditMove: 'draw:editmove',
  onEditResize: 'draw:editresize',
  onEditVertex: 'draw:editvertex',
  onEditStop: 'draw:editstop',
  onDeleted: 'draw:deleted',
  onDeleteStart: 'draw:deletestart',
  onDeleteStop: 'draw:deletestop',
};

function CustomEditControl(props) {
  const context = useLeafletContext();
  const drawRef = useRef();
  const propsRef = useRef(props);
  const onDrawCreate = (e) => {
    const { onCreated } = props;
    const container = context.layerContainer || context.map;
    container.addLayer(e.layer);
    onCreated && onCreated(e);
  };
  
  React.useEffect(() => {
    const { map } = context;
    const { onMounted } = props;

    for (const key in eventHandlers) {
      if (props[key]) {
        map.on(eventHandlers[key], props[key]);
      }
    }
    map.on(leaflet.Draw.Event.CREATED, onDrawCreate);
    drawRef.current = createDrawElement(props, context);
    map.addControl(drawRef.current);
    onMounted && onMounted(drawRef.current);
    return () => {
      map.off(leaflet.Draw.Event.CREATED, onDrawCreate);
      for (const key in eventHandlers) {
        if (props[key]) {
          map.off(eventHandlers[key], props[key]);
        }
      }
      drawRef.current.remove(map);
    };
  }, [props.onCreated, props.onDeleted, props.onEdited]);
  React.useEffect(() => {
    if (
      isEqual(props.draw, propsRef.current.draw) &&
      isEqual(props.edit, propsRef.current.edit) &&
      props.position === propsRef.current.position
    ) {
      return;
    }
    const { map } = context;
    drawRef.current.remove(map);
    drawRef.current = createDrawElement(props, context);
    drawRef.current.addTo(map);
    const { onMounted } = props;
    onMounted && onMounted(drawRef.current);
    return () => {
      drawRef.current.remove(map);
    };
  }, [
    props.draw, 
    props.edit, 
    props.position, 
    props.onCreated,
    props.onDeleted,
    props.onEdited
  ]);
  return null;
}