import {Injectable, NgZone} from '@angular/core';
import {Observable, Observer} from 'rxjs';

import * as mapTypes from './google-maps-types';
import {Polyline} from './google-maps-types';
import {PolylineOptions} from './google-maps-types';
import {MapsAPILoader} from './maps-api-loader/maps-api-loader';

// todo: add types for this
declare var google: any;

/**
 * Wrapper class that handles the communication with the Google Maps Javascript
 * API v3
 */
@Injectable()
export class GoogleMapsAPIWrapper {
  private _map: Promise<mapTypes.GoogleMap>;
  private _mapResolver: (value?: mapTypes.GoogleMap) => void;

  constructor(private _loader: MapsAPILoader, private _zone: NgZone) {
    this._map =
        new Promise<mapTypes.GoogleMap>((resolve: () => void) => { this._mapResolver = resolve; });
  }

  createMap(el: HTMLElement, mapOptions: mapTypes.MapOptions): Promise<void> {
    return this._zone.runOutsideAngular( () => {
      return this._loader.load().then(() => {
        const map = new google.maps.Map(el, mapOptions);
        this._mapResolver(<mapTypes.GoogleMap>map);
        return;
      });
    });
  }

  setMapOptions(options: mapTypes.MapOptions) {
    this._map.then((m: mapTypes.GoogleMap) => { m.setOptions(options); });
  }

  /**
   * Creates a google map marker with the map context
   */
  createMarker(options: mapTypes.MarkerOptions = <mapTypes.MarkerOptions>{}, addToMap: boolean = true):
      Promise<mapTypes.Marker> {
    return this._map.then((map: mapTypes.GoogleMap) => {
      if (addToMap) {
        options.map = map;
      }
      if (options.icon) {
        const { anchor, size, origin } = options.icon;
        if (size) {
          options.icon.size = new google.maps.Size(size[0], size[1]);
          options.icon.scaledSize = new google.maps.Size(size[0], size[1]);
        }
        if (origin) {
          options.icon.origin = new google.maps.Point(origin[0], origin[1]);
        }
        if (anchor) {
          options.icon.anchor = new google.maps.Point(anchor[0], anchor[1]);
        }
      }

      return new google.maps.Marker(options);
    });
  }

  createInfoWindow(options?: mapTypes.InfoWindowOptions): Promise<mapTypes.InfoWindow> {
    return this._map.then(() => { return new google.maps.InfoWindow(options); });
  }

  /**
   * Creates a google.map.Circle for the current map.
   */
  createCircle(options: mapTypes.CircleOptions): Promise<mapTypes.Circle> {
    return this._map.then((map: mapTypes.GoogleMap) => {
      options.map = map;
      return new google.maps.Circle(options);
    });
  }

  /**
   * Creates a google.map.Rectangle for the current map.
   */
  createRectangle(options: mapTypes.RectangleOptions): Promise<mapTypes.Rectangle> {
    return this._map.then((map: mapTypes.GoogleMap) => {
      options.map = map;
      return new google.maps.Rectangle(options);
    });
  }

  createPolyline(options: PolylineOptions): Promise<Polyline> {
    return this.getNativeMap().then((map: mapTypes.GoogleMap) => {
      let line = new google.maps.Polyline(options);
      line.setMap(map);
      return line;
    });
  }

  createPolygon(options: mapTypes.PolygonOptions): Promise<mapTypes.Polygon> {
    return this.getNativeMap().then((map: mapTypes.GoogleMap) => {
      let polygon = new google.maps.Polygon(options);
      polygon.setMap(map);
      return polygon;
    });
  }

  /**
   * Creates a new google.map.Data layer for the current map
   */
  createDataLayer(options?: mapTypes.DataOptions): Promise<mapTypes.Data> {
    return this._map.then(m => {
      let data = new google.maps.Data(options);
      data.setMap(m);
      return data;
    });
  }

  /**
   * Determines if given coordinates are insite a Polygon path.
   */
  containsLocation(latLng: mapTypes.LatLngLiteral, polygon: mapTypes.Polygon): Promise<boolean> {
    return google.maps.geometry.poly.containsLocation(latLng, polygon);
  }

  subscribeToMapEvent<E>(eventName: string): Observable<E> {
    return new Observable((observer: Observer<E>) => {
      this._map.then((m: mapTypes.GoogleMap) => {
        m.addListener(eventName, (arg: E) => { this._zone.run(() => observer.next(arg)); });
      });
    });
  }

  clearInstanceListeners() {
    this._map.then((map: mapTypes.GoogleMap) => {
      google.maps.event.clearInstanceListeners(map);
    });
  }

  setCenter(latLng: mapTypes.LatLngLiteral): Promise<void> {
    return this._map.then((map: mapTypes.GoogleMap) => map.setCenter(latLng));
  }

  getZoom(): Promise<number> { return this._map.then((map: mapTypes.GoogleMap) => map.getZoom()); }

  getBounds(): Promise<mapTypes.LatLngBounds> {
    return this._map.then((map: mapTypes.GoogleMap) => map.getBounds());
  }

  getMapTypeId(): Promise<mapTypes.MapTypeId> {
    return this._map.then((map: mapTypes.GoogleMap) => map.getMapTypeId());
  }

  setZoom(zoom: number): Promise<void> {
    return this._map.then((map: mapTypes.GoogleMap) => map.setZoom(zoom));
  }

  getCenter(): Promise<mapTypes.LatLng> {
    return this._map.then((map: mapTypes.GoogleMap) => map.getCenter());
  }

  panTo(latLng: mapTypes.LatLng|mapTypes.LatLngLiteral): Promise<void> {
    return this._map.then((map) => map.panTo(latLng));
  }

  panBy(x: number, y: number): Promise<void> {
    return this._map.then((map) => map.panBy(x, y));
  }

  fitBounds(latLng: mapTypes.LatLngBounds|mapTypes.LatLngBoundsLiteral): Promise<void> {
    return this._map.then((map) => map.fitBounds(latLng));
  }

  panToBounds(latLng: mapTypes.LatLngBounds|mapTypes.LatLngBoundsLiteral): Promise<void> {
    return this._map.then((map) => map.panToBounds(latLng));
  }

  /**
   * Returns the native Google Maps Map instance. Be careful when using this instance directly.
   */
  getNativeMap(): Promise<mapTypes.GoogleMap> { return this._map; }

  /**
   * Triggers the given event name on the map instance.
   */
  triggerMapEvent(eventName: string): Promise<void> {
    return this._map.then((m) => google.maps.event.trigger(m, eventName));
  }
}
