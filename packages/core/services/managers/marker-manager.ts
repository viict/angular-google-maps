import {Injectable, NgZone} from '@angular/core';
import {Observable, Observer} from 'rxjs';

import {AgmMarker} from './../../directives/marker';

import {GoogleMapsAPIWrapper} from './../google-maps-api-wrapper';
import {Marker} from './../google-maps-types';

declare var google: any;

@Injectable()
export class MarkerManager {
  protected _markers: Map<AgmMarker, Promise<Marker>> =
      new Map<AgmMarker, Promise<Marker>>();

  constructor(protected _mapsWrapper: GoogleMapsAPIWrapper, protected _zone: NgZone) {}

  deleteMarker(marker: AgmMarker): Promise<void> {
    const m = this._markers.get(marker);
    if (m == null) {
      // marker already deleted
      return Promise.resolve();
    }
    return m.then((m: Marker) => {
      return this._zone.run(() => {
        m.setMap(null);
        this._markers.delete(marker);
      });
    });
  }

  updateMarkerPosition(marker: AgmMarker): Promise<void> {
    const newCenter = {
      lat: marker.latitude,
      lng: marker.longitude
    };
    // whenever the marker is updated, set the map center to that
    // marker's new position.

     // NOTE: if multiple markers are visible and one changes, this might
    // lead to eratic behavior. For now, we don't have such a scenario
    this._mapsWrapper.setCenter(newCenter);
    return this._markers.get(marker).then(
        (m: Marker) => m.setPosition({lat: marker.latitude, lng: marker.longitude}));
  }

  updateTitle(marker: AgmMarker): Promise<void> {
    return this._markers.get(marker).then((m: Marker) => m.setTitle(marker.title));
  }

  updateLabel(marker: AgmMarker): Promise<void> {
    return this._markers.get(marker).then((m: Marker) => { m.setLabel(marker.label); });
  }

  updateDraggable(marker: AgmMarker): Promise<void> {
    return this._markers.get(marker).then((m: Marker) => m.setDraggable(marker.draggable));
  }

  updateIcon(marker: AgmMarker): Promise<void> {
    return this._markers.get(marker).then((m: Marker) => m.setIcon({
      url: marker.iconUrl,
      size: marker.iconSize ? new google.maps.Size(marker.iconSize[0], marker.iconSize[1]) : null,
      scaledSize: marker.iconSize ? new google.maps.Size(marker.iconSize[0], marker.iconSize[1]) : null,
      anchor: marker.iconAnchor ? new google.maps.Point(marker.iconAnchor[0], marker.iconAnchor[1]) : null,
      origin: marker.iconOrigin ? new google.maps.Point(marker.iconOrigin[0], marker.iconOrigin[1]) : null
    }));
  }

  updateOpacity(marker: AgmMarker): Promise<void> {
    return this._markers.get(marker).then((m: Marker) => m.setOpacity(marker.opacity));
  }

  updateVisible(marker: AgmMarker): Promise<void> {
    return this._markers.get(marker).then((m: Marker) => m.setVisible(marker.visible));
  }

  updateZIndex(marker: AgmMarker): Promise<void> {
    return this._markers.get(marker).then((m: Marker) => m.setZIndex(marker.zIndex));
  }

  updateClickable(marker: AgmMarker): Promise<void> {
    return this._markers.get(marker).then((m: Marker) => m.setClickable(marker.clickable));
  }

  updateAnimation(marker: AgmMarker): Promise<void> {
    return this._markers.get(marker).then((m: Marker) => {
      if (typeof marker.animation === 'string') {
        m.setAnimation(google.maps.Animation[marker.animation]);
      } else {
        m.setAnimation(marker.animation);
      }
    });
  }

  addMarker(marker: AgmMarker) {
    const markerPromise = this._mapsWrapper.createMarker({
      position: {lat: marker.latitude, lng: marker.longitude},
      label: marker.label,
      draggable: marker.draggable,
      icon: {
        url: marker.iconUrl,
        size: marker.iconSize ? marker.iconSize : undefined,
        anchor: marker.iconAnchor ? marker.iconAnchor : undefined,
        origin: marker.iconOrigin ? marker.iconOrigin : undefined
      },
      opacity: marker.opacity,
      visible: marker.visible,
      zIndex: marker.zIndex,
      title: marker.title,
      clickable: marker.clickable,
      animation: (typeof marker.animation === 'string') ? google.maps.Animation[marker.animation] : marker.animation
    });

    this._markers.set(marker, markerPromise);
  }

  getNativeMarker(marker: AgmMarker): Promise<Marker> {
    return this._markers.get(marker);
  }

  createEventObservable<T>(eventName: string, marker: AgmMarker): Observable<T> {
    return new Observable((observer: Observer<T>) => {
      this._markers.get(marker).then((m: Marker) => {
        m.addListener(eventName, (e: T) => this._zone.run(() => observer.next(e)));
      });
    });
  }
}
