import {
  Component, Input, OnChanges, SimpleChanges,
  ElementRef, ViewChild, AfterViewInit, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-stat-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-wrapper" [style.height]="height">
      @if (isEmpty) {
        <div class="chart-empty">Sin datos suficientes</div>
      } @else {
        <canvas #chartCanvas></canvas>
      }
    </div>
  `,
  styles: [`
    .chart-wrapper {
      position: relative;
      width: 100%;
      canvas { display: block; width: 100% !important; height: 100% !important; }
    }
    .chart-empty {
      height: 100%; display: flex; align-items: center; justify-content: center;
      color: #aaa; font-size: 0.85rem; font-style: italic;
    }
  `]
})
export class StatChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('chartCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() config!: ChartConfiguration;
  @Input() height = '200px';

  private chart: Chart | null = null;

  get isEmpty(): boolean {
    if (!this.config) return true;
    const datasets = this.config.data?.datasets ?? [];
    return datasets.every(d => !d.data || d.data.length === 0);
  }

  ngAfterViewInit() {
    if (!this.isEmpty) this.buildChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['config'] && this.canvasRef && !this.isEmpty) {
      this.destroyChart();
      // Defer one tick to allow isEmpty-controlled canvas to appear in DOM
      setTimeout(() => this.buildChart(), 0);
    }
  }

  ngOnDestroy() {
    this.destroyChart();
  }

  private buildChart() {
    if (!this.canvasRef?.nativeElement) return;
    this.destroyChart();
    this.chart = new Chart(this.canvasRef.nativeElement, {
      ...this.config,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...this.config.options,
      }
    });
  }

  private destroyChart() {
    this.chart?.destroy();
    this.chart = null;
  }
}
