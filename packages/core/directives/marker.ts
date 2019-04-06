import { AfterContentInit, ContentChildren, Directive, EventEmitter, Input, OnChanges, OnDestroy, Output, QueryList, SimpleChange, forwardRef } from '@angular/core';
import { Observable, ReplaySubject, Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MarkerLabel, MouseEvent } from '../map-types';
import { FitBoundsAccessor, FitBoundsDetails } from '../services/fit-bounds';
import * as mapTypes from '../services/google-maps-types';
import { MarkerManager } from '../services/managers/marker-manager';
import { AgmInfoWindow } from './info-window';

let markerId = 0;

/**
 * AgmMarker renders a map marker inside a {@link AgmMap}.
 *
 * ### Example
 * ```typescript
 * import { Component } from '@angular/core';
 *
 * @Component({
 *  selector: 'my-map-cmp',
 *  styles: [`
 *    .agm-map-container {
 *      height: 300px;
 *    }
 * `],
 *  template: `
 *    <agm-map [latitude]="lat" [longitude]="lng" [zoom]="zoom">
 *      <agm-marker [latitude]="lat" [longitude]="lng" [label]="'M'">
 *      </agm-marker>
 *    </agm-map>
 *  `
 * })
 * ```
 */
@Directive({
  selector: 'agm-marker',
  providers: [
    {provide: FitBoundsAccessor, useExisting: forwardRef(() => AgmMarker)}
  ],
  inputs: [
    'latitude', 'longitude', 'title', 'label', 'draggable: markerDraggable', 'iconUrl',
    'iconOrigin', 'iconAnchor', 'iconSize', 'openInfoWindow', 'opacity', 'visible',
    'zIndex', 'animation'
  ],
  outputs: ['markerClick', 'dragEnd', 'mouseOver', 'mouseOut']
})
export class AgmMarker implements OnDestroy, OnChanges, AfterContentInit, FitBoundsAccessor {
  /**
   * The latitude position of the marker.
   */
  @Input() latitude: number;

  /**
   * The longitude position of the marker.
   */
  @Input() longitude: number;

  /**
   * The title of the marker.
   */
  @Input() title: string;

  /**
   * The label (a single uppercase character) for the marker.
   */
  @Input() label: string | MarkerLabel;

  /**
   * If true, the marker can be dragged. Default value is false.
   */
  // tslint:disable-next-line:no-input-rename
  @Input('markerDraggable') draggable: boolean = false;

  /**
   * Icon (the URL of the image) for the foreground.
   */
  @Input() iconUrl: string;

  /**
   * Define the width and height for the marker
   */
  @Input() iconSize: mapTypes.TupleSize = null;

  /**
   * Define the origin X and Y for the marker
   */
  @Input() iconOrigin: mapTypes.TupleSize = null;

  /**
   * Define the anchor X and Y for the marker
   */
  @Input() iconAnchor: mapTypes.TupleSize = null;

  /**
   * If true, the marker is visible
   */
  @Input() visible: boolean = true;

  /**
   * Whether to automatically open the child info window when the marker is clicked.
   */
  @Input() openInfoWindow: boolean = true;

  /**
   * The marker's opacity between 0.0 and 1.0.
   */
  @Input() opacity: number = 1;

  /**
   * All markers are displayed on the map in order of their zIndex, with higher values displaying in
   * front of markers with lower values. By default, markers are displayed according to their
   * vertical position on screen, with lower markers appearing in front of markers further up the
   * screen.
   */
  @Input() zIndex: number = 1;

  /**
   * If true, the marker can be clicked. Default value is true.
   */
  // tslint:disable-next-line:no-input-rename
  @Input('markerClickable') clickable: boolean = true;

  /**
   * Which animation to play when marker is added to a map.
   * This can be 'BOUNCE' or 'DROP'
   */
  animation: 'BOUNCE' | 'DROP' | null;

  /**
   * This event emitter gets emitted when the user clicks on the marker.
   */
  @Output() markerClick: EventEmitter<AgmMarker> = new EventEmitter<AgmMarker>();

  /**
   * This event is fired when the user rightclicks on the marker.
   */
  @Output() markerRightClick: EventEmitter<void> = new EventEmitter<void>();

  /**
   * This event is fired when the user starts dragging the marker.
   */
  @Output() dragStart: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();

  /**
   * This event is repeatedly fired while the user drags the marker.
   */
  @Output() drag: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();

  /**
   * This event is fired when the user stops dragging the marker.
   */
  @Output() dragEnd: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();

  /**
   * This event is fired when the user mouses over the marker.
   */
  @Output() mouseOver: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();

  /**
   * This event is fired when the user mouses outside the marker.
   */
  @Output() mouseOut: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();

  /**
   * @internal
   */
  @ContentChildren(AgmInfoWindow) infoWindow: QueryList<AgmInfoWindow> = new QueryList<AgmInfoWindow>();

  private _markerAddedToManger: boolean = false;
  private _id: string;
  private _observableSubscriptions: Subscription[] = [];

  protected readonly _fitBoundsDetails$: ReplaySubject<FitBoundsDetails> = new ReplaySubject<FitBoundsDetails>(1);

  constructor(private _markerManager: MarkerManager) { this._id = (markerId++).toString(); }

  /* @internal */
  ngAfterContentInit() {
    this.handleInfoWindowUpdate();
    this.infoWindow.changes.subscribe(() => this.handleInfoWindowUpdate());
  }

  private handleInfoWindowUpdate() {
    if (this.infoWindow.length > 1) {
      throw new Error('Expected no more than one info window.');
    }
    this.infoWindow.forEach(marker => {
      marker.hostMarker = this;
    });
  }

  /** @internal */
  ngOnChanges(changes: {[key: string]: SimpleChange}) {
    if (typeof this.latitude === 'string') {
      this.latitude = Number(this.latitude);
    }
    if (typeof this.longitude === 'string') {
      this.longitude = Number(this.longitude);
    }
    if (typeof this.latitude !== 'number' || typeof this.longitude !== 'number') {
      return;
    }
    if (!this._markerAddedToManger) {
      this._markerManager.addMarker(this);
      this._updateFitBoundsDetails();
      this._markerAddedToManger = true;
      this._addEventListeners();
      return;
    }
    if (changes['latitude'] || changes['longitude']) {
      this._markerManager.updateMarkerPosition(this);
      // Calling this will add the new coordinates to the fitBounds, resulting
      // in incorrect zoom or center values.
      // this._updateFitBoundsDetails();
    }
    if (changes['title']) {
      this._markerManager.updateTitle(this);
    }
    if (changes['label']) {
      this._markerManager.updateLabel(this);
    }
    if (changes['draggable']) {
      this._markerManager.updateDraggable(this);
    }
    if (changes['iconUrl'] || changes['iconAnchor'] || changes['iconOrigin'] || changes['iconSize']) {
      this._markerManager.updateIcon(this);
    }
    if (changes['opacity']) {
      this._markerManager.updateOpacity(this);
    }
    if (changes['visible']) {
      this._markerManager.updateVisible(this);
    }
    if (changes['zIndex']) {
      this._markerManager.updateZIndex(this);
    }
    if (changes['clickable']) {
      this._markerManager.updateClickable(this);
    }
    if (changes['animation']) {
      this._markerManager.updateAnimation(this);
    }
  }

  /**
   * @internal
   */
  getFitBoundsDetails$(): Observable<FitBoundsDetails> {
    return this._fitBoundsDetails$.asObservable();
  }

  protected _updateFitBoundsDetails() {
    this._fitBoundsDetails$.next({latLng: {lat: this.latitude, lng: this.longitude}});
  }

  private _addEventListeners() {
    const cs = this._markerManager.createEventObservable('click', this).subscribe(() => {
      if (this.openInfoWindow) {
        this.infoWindow.forEach(infoWindow => infoWindow.open());
      }
      this.markerClick.emit(this);
    });
    this._observableSubscriptions.push(cs);

    const rc = this._markerManager.createEventObservable('rightclick', this).subscribe(() => {
      this.markerRightClick.emit(null);
    });
    this._observableSubscriptions.push(rc);

    const ds =
        this._markerManager.createEventObservable<mapTypes.MouseEvent>('dragstart', this)
            .subscribe((e: mapTypes.MouseEvent) => {
              this.dragStart.emit(<MouseEvent>{coords: {lat: e.latLng.lat(), lng: e.latLng.lng()}});
            });
    this._observableSubscriptions.push(ds);

    const d =
        this._markerManager.createEventObservable<mapTypes.MouseEvent>('drag', this)
            .subscribe((e: mapTypes.MouseEvent) => {
              this.drag.emit(<MouseEvent>{coords: {lat: e.latLng.lat(), lng: e.latLng.lng()}});
            });
    this._observableSubscriptions.push(d);

    const de =
        this._markerManager.createEventObservable<mapTypes.MouseEvent>('dragend', this)
            .subscribe((e: mapTypes.MouseEvent) => {
              this.dragEnd.emit(<MouseEvent>{coords: {lat: e.latLng.lat(), lng: e.latLng.lng()}});
            });
    this._observableSubscriptions.push(de);

    const mover =
        this._markerManager.createEventObservable<mapTypes.MouseEvent>('mouseover', this)
            .subscribe((e: mapTypes.MouseEvent) => {
              this.mouseOver.emit(<MouseEvent>{coords: {lat: e.latLng.lat(), lng: e.latLng.lng()}});
            });
    this._observableSubscriptions.push(mover);

    const mout =
        this._markerManager.createEventObservable<mapTypes.MouseEvent>('mouseout', this)
            .subscribe((e: mapTypes.MouseEvent) => {
              this.mouseOut.emit(<MouseEvent>{coords: {lat: e.latLng.lat(), lng: e.latLng.lng()}});
            });
    this._observableSubscriptions.push(mout);
  }

  /** @internal */
  id(): string { return this._id; }

  /** @internal */
  toString(): string { return 'AgmMarker-' + this._id.toString(); }

  /** @internal */
  ngOnDestroy() {
    this._markerManager.deleteMarker(this);
    // unsubscribe all registered observable subscriptions
    this._observableSubscriptions.forEach((s) => s.unsubscribe());
  }
}
