import {NgModule} from '@angular/core';
import {AgmCoreModule} from '@a7gm/core';
import {AgmMarkerCluster} from './directives/marker-cluster';

@NgModule({
  imports: [AgmCoreModule],
  declarations: [AgmMarkerCluster],
  exports: [AgmMarkerCluster]
})
export class AgmJsMarkerClustererModule {
}
