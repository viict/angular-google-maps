import {Injectable, NgZone} from '@angular/core';

import 'js-marker-clusterer';

import {MarkerManager} from '../../../core/services/managers/marker-manager';
import {GoogleMapsAPIWrapper} from '../../../core/services/google-maps-api-wrapper';
import {AgmMarker} from '../../../core/directives/marker';
import {AgmMarkerCluster} from './../../directives/marker-cluster';
import {Marker} from '@a7gm/core/services/google-maps-types';
import {MarkerClustererInstance, ClusterOptions} from '../google-clusterer-types';

declare var MarkerClusterer: any;

@Injectable()
export class ClusterManager extends MarkerManager {
  private _clustererInstance: Promise<MarkerClustererInstance>;
  private _resolver: Function;

  constructor(protected _mapsWrapper: GoogleMapsAPIWrapper, protected _zone: NgZone) {
    super(_mapsWrapper, _zone);
    this._clustererInstance = new Promise<MarkerClustererInstance>((resolver) => {
      this._resolver = resolver;
    });
  }

  init(options: ClusterOptions): void {
    this._mapsWrapper.getNativeMap().then(map => {
      const clusterer = new MarkerClusterer(map, [], options);
      this._resolver(clusterer);
    });
  }

  getClustererInstance(): Promise<MarkerClustererInstance> {
    return this._clustererInstance;
  }

  addMarker(marker: AgmMarker): void {
    const clusterPromise: Promise<MarkerClustererInstance> = this.getClustererInstance();
    const markerPromise = this._mapsWrapper
      .createMarker({
        position: {
          lat: marker.latitude,
          lng: marker.longitude
        },
        label: marker.label,
        draggable: marker.draggable,
        icon: { url: marker.iconUrl },
        opacity: marker.opacity,
        visible: marker.visible,
        zIndex: marker.zIndex,
        title: marker.title,
        clickable: marker.clickable,
      }, false);

    Promise
      .all([clusterPromise, markerPromise])
      .then(([cluster, marker]) => {
        return cluster.addMarker(marker);
      });
    this._markers.set(marker, markerPromise);
  }

  deleteMarker(marker: AgmMarker): Promise<void> {
    const m = this._markers.get(marker);
    if (m == null) {
      // marker already deleted
      return Promise.resolve();
    }
    return m.then((m: Marker) => {
      this._zone.run(() => {
        m.setMap(null);
        this.getClustererInstance().then(cluster => {
          cluster.removeMarker(m);
          this._markers.delete(marker);
        });
      });
    });
  }

  clearMarkers(): Promise<void> {
    return this.getClustererInstance().then(cluster => {
      cluster.clearMarkers();
    });
  }

  setGridSize(c: AgmMarkerCluster): void {
    this.getClustererInstance().then(cluster => {
      cluster.setGridSize(c.gridSize);
    });
  }

  setMaxZoom(c: AgmMarkerCluster): void {
    this.getClustererInstance().then(cluster => {
      cluster.setMaxZoom(c.maxZoom);
    });
  }

  setStyles(c: AgmMarkerCluster): void {
    this.getClustererInstance().then(cluster => {
      cluster.setStyles(c.styles);
    });
  }

  setZoomOnClick(c: AgmMarkerCluster): void {
    this.getClustererInstance().then(cluster => {
      if (c.zoomOnClick !== undefined) {
        cluster.zoomOnClick_ = c.zoomOnClick;
      }
    });
  }

  setAverageCenter(c: AgmMarkerCluster): void {
    this.getClustererInstance().then(cluster => {
      if (c.averageCenter !== undefined) {
        cluster.averageCenter_ = c.averageCenter;
      }
    });
  }

  setImagePath(c: AgmMarkerCluster): void {
    this.getClustererInstance().then(cluster => {
      if (c.imagePath !== undefined) {
        cluster.imagePath_ = c.imagePath;
      }
    });
  }

  setMinimumClusterSize(c: AgmMarkerCluster): void {
    this.getClustererInstance().then(cluster => {
      if (c.minimumClusterSize !== undefined) {
        cluster.minimumClusterSize_ = c.minimumClusterSize;
      }
    });
  }

  setImageExtension(c: AgmMarkerCluster): void {
    this.getClustererInstance().then(cluster => {
      if (c.imageExtension !== undefined) {
        cluster.imageExtension_ = c.imageExtension;
      }
    });
  }

  setCalculator (c: AgmMarkerCluster): void {
    this.getClustererInstance().then(cluster => {
      if (typeof c.calculator === 'function') {
        cluster.setCalculator(c.calculator);
      }
    });
  }
}
