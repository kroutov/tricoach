package com.tricoach.android.features.analytics

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.patrykandpatrick.vico.compose.cartesian.CartesianChartHost
import com.patrykandpatrick.vico.compose.cartesian.axis.rememberBottom
import com.patrykandpatrick.vico.compose.cartesian.axis.rememberStart
import com.patrykandpatrick.vico.compose.cartesian.layer.rememberColumnCartesianLayer
import com.patrykandpatrick.vico.compose.cartesian.layer.rememberLine
import com.patrykandpatrick.vico.compose.cartesian.layer.rememberLineCartesianLayer
import com.patrykandpatrick.vico.compose.cartesian.rememberCartesianChart
import com.patrykandpatrick.vico.compose.common.component.rememberLineComponent
import com.patrykandpatrick.vico.compose.common.fill
import com.patrykandpatrick.vico.compose.m3.common.rememberM3VicoTheme
import com.patrykandpatrick.vico.compose.common.ProvideVicoTheme
import com.patrykandpatrick.vico.core.cartesian.axis.HorizontalAxis
import com.patrykandpatrick.vico.core.cartesian.axis.VerticalAxis
import com.patrykandpatrick.vico.core.cartesian.data.CartesianChartModelProducer
import com.patrykandpatrick.vico.core.cartesian.data.CartesianValueFormatter
import com.patrykandpatrick.vico.core.cartesian.data.columnSeries
import com.patrykandpatrick.vico.core.cartesian.data.lineSeries
import com.patrykandpatrick.vico.core.cartesian.layer.ColumnCartesianLayer
import com.patrykandpatrick.vico.core.cartesian.layer.LineCartesianLayer
import com.patrykandpatrick.vico.core.cartesian.data.ColumnCartesianLayerModel
import com.patrykandpatrick.vico.core.common.data.ExtraStore
import com.tricoach.android.R
import com.tricoach.android.app.AppContainer
import com.tricoach.android.features.shared.CardBox
import com.tricoach.android.features.shared.intensityColor
import com.tricoach.android.models.DashboardAnalytics
import com.tricoach.android.models.WorkoutIntensity
import com.tricoach.android.models.label

/** Advanced dashboard analytics (4 Vico charts) — mirrors iOS's DashboardAnalyticsView, reachable from the Dashboard via the "Analytique complète" card. */
@Composable
fun DashboardAnalyticsScreen(container: AppContainer) {
    var analytics by remember { mutableStateOf<DashboardAnalytics?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val errorLoadFailedText = stringResource(R.string.analytics_error_load_failed)

    LaunchedEffect(Unit) {
        isLoading = true
        errorMessage = null
        analytics = try {
            container.dashboardApi.fetchAnalytics()
        } catch (e: Exception) {
            errorMessage = errorLoadFailedText
            null
        }
        isLoading = false
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Text(stringResource(R.string.analytics_title), style = MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(16.dp))

        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            val a = analytics
            when {
                isLoading -> Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                errorMessage != null -> Text(errorMessage!!, color = MaterialTheme.colorScheme.error)
                a?.hasActivePlan != true -> Text(
                    stringResource(R.string.analytics_no_active_plan),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                else -> {
                    WeeklyLoadCard(a)
                    LoadFormCard(a)
                    ZoneDistributionCard(a)
                    if (a.vo2maxTrend.isNotEmpty()) {
                        Vo2MaxCard(a)
                    }
                }
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun WeeklyLoadCard(analytics: DashboardAnalytics) {
    CardBox {
        Text(stringResource(R.string.analytics_weekly_load_title), style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(4.dp))
        LegendRow(
            listOf(
                stringResource(R.string.analytics_legend_planned) to MaterialTheme.colorScheme.primary,
                stringResource(R.string.analytics_legend_completed) to MaterialTheme.colorScheme.tertiary,
            ),
        )
        Spacer(Modifier.height(8.dp))

        val points = analytics.weeklyLoad
        val modelProducer = remember { CartesianChartModelProducer() }
        LaunchedEffect(points) {
            modelProducer.runTransaction {
                columnSeries {
                    series(points.map { it.weekNumber }, points.map { it.plannedLoad })
                    series(points.map { it.weekNumber }, points.map { it.completedLoad })
                }
            }
        }
        val plannedColor = MaterialTheme.colorScheme.primary
        val completedColor = MaterialTheme.colorScheme.tertiary
        val weekAxisPrefix = stringResource(R.string.analytics_week_axis_prefix)
        ProvideVicoTheme(rememberM3VicoTheme()) {
            CartesianChartHost(
                chart = rememberCartesianChart(
                    rememberColumnCartesianLayer(
                        columnProvider = ColumnCartesianLayer.ColumnProvider.series(
                            listOf(
                                rememberLineComponent(fill = fill(plannedColor), thickness = 8.dp),
                                rememberLineComponent(fill = fill(completedColor), thickness = 8.dp),
                            ),
                        ),
                    ),
                    startAxis = VerticalAxis.rememberStart(),
                    bottomAxis = HorizontalAxis.rememberBottom(
                        valueFormatter = CartesianValueFormatter { _, value, _ -> "$weekAxisPrefix${value.toInt()}" },
                    ),
                ),
                modelProducer = modelProducer,
                modifier = Modifier.fillMaxWidth().height(220.dp),
            )
        }
    }
}

@Composable
private fun LoadFormCard(analytics: DashboardAnalytics) {
    CardBox {
        Text(stringResource(R.string.analytics_load_form_title), style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(4.dp))
        LegendRow(
            listOf(
                stringResource(R.string.analytics_legend_ctl) to MaterialTheme.colorScheme.primary,
                stringResource(R.string.analytics_legend_atl) to MaterialTheme.colorScheme.tertiary,
            ),
        )
        Spacer(Modifier.height(8.dp))

        val points = analytics.loadForm
        val modelProducer = remember { CartesianChartModelProducer() }
        LaunchedEffect(points) {
            modelProducer.runTransaction {
                lineSeries {
                    series(points.indices.map { it }, points.map { it.ctl })
                    series(points.indices.map { it }, points.map { it.atl })
                }
            }
        }
        val ctlColor = MaterialTheme.colorScheme.primary
        val atlColor = MaterialTheme.colorScheme.tertiary
        ProvideVicoTheme(rememberM3VicoTheme()) {
            CartesianChartHost(
                chart = rememberCartesianChart(
                    rememberLineCartesianLayer(
                        lineProvider = LineCartesianLayer.LineProvider.series(
                            LineCartesianLayer.rememberLine(fill = LineCartesianLayer.LineFill.single(fill(ctlColor))),
                            LineCartesianLayer.rememberLine(fill = LineCartesianLayer.LineFill.single(fill(atlColor))),
                        ),
                    ),
                    startAxis = VerticalAxis.rememberStart(),
                    bottomAxis = HorizontalAxis.rememberBottom(),
                ),
                modelProducer = modelProducer,
                modifier = Modifier.fillMaxWidth().height(220.dp),
            )
        }

        val lastTsb = points.lastOrNull()?.tsb
        if (lastTsb != null) {
            Spacer(Modifier.height(8.dp))
            val tsbText = when {
                lastTsb > 5 -> stringResource(R.string.analytics_tsb_fresh, lastTsb.toInt())
                lastTsb < -15 -> stringResource(R.string.analytics_tsb_high_fatigue, lastTsb.toInt())
                else -> stringResource(R.string.analytics_tsb_balanced, lastTsb.toInt())
            }
            Text(tsbText, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun ZoneDistributionCard(analytics: DashboardAnalytics) {
    CardBox {
        Text(stringResource(R.string.analytics_zone_distribution_title), style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))

        val points = analytics.zoneDistribution
        val order = listOf(WorkoutIntensity.EASY, WorkoutIntensity.MODERATE, WorkoutIntensity.HARD)
        val ordered = order.mapNotNull { intensity -> points.firstOrNull { it.intensity == intensity } }
        val modelProducer = remember { CartesianChartModelProducer() }
        LaunchedEffect(ordered) {
            modelProducer.runTransaction {
                columnSeries { series(ordered.indices.map { it }, ordered.map { it.totalLoad }) }
            }
        }
        val colors = ordered.map { intensityColor(it.intensity) }
        val labels = ordered.map { it.intensity.label }
        ProvideVicoTheme(rememberM3VicoTheme()) {
            CartesianChartHost(
                chart = rememberCartesianChart(
                    rememberColumnCartesianLayer(
                        columnProvider = IntensityColumnProvider(colors.map { rememberLineComponent(fill = fill(it), thickness = 24.dp) }),
                    ),
                    startAxis = VerticalAxis.rememberStart(),
                    bottomAxis = HorizontalAxis.rememberBottom(
                        valueFormatter = CartesianValueFormatter { _, value, _ ->
                            labels.getOrElse(value.toInt()) { "" }
                        },
                    ),
                ),
                modelProducer = modelProducer,
                modifier = Modifier.fillMaxWidth().height(220.dp),
            )
        }
    }
}

@Composable
private fun Vo2MaxCard(analytics: DashboardAnalytics) {
    CardBox {
        Text(stringResource(R.string.analytics_vo2max_trend_title), style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))

        val points = analytics.vo2maxTrend
        val modelProducer = remember { CartesianChartModelProducer() }
        LaunchedEffect(points) {
            modelProducer.runTransaction {
                lineSeries { series(points.indices.map { it }, points.map { it.vo2max }) }
            }
        }
        val lineColor = MaterialTheme.colorScheme.primary
        ProvideVicoTheme(rememberM3VicoTheme()) {
            CartesianChartHost(
                chart = rememberCartesianChart(
                    rememberLineCartesianLayer(
                        lineProvider = LineCartesianLayer.LineProvider.series(
                            LineCartesianLayer.rememberLine(fill = LineCartesianLayer.LineFill.single(fill(lineColor))),
                        ),
                    ),
                    startAxis = VerticalAxis.rememberStart(),
                    bottomAxis = HorizontalAxis.rememberBottom(),
                ),
                modelProducer = modelProducer,
                modifier = Modifier.fillMaxWidth().height(220.dp),
            )
        }
    }
}

/** Colors columns by their x-position (category index) rather than by series — used for the single-series zone distribution chart, where each x-value is a distinct intensity, not a separate series. */
private class IntensityColumnProvider(
    private val columns: List<com.patrykandpatrick.vico.core.common.component.LineComponent>,
) : ColumnCartesianLayer.ColumnProvider {
    override fun getColumn(
        entry: ColumnCartesianLayerModel.Entry,
        seriesIndex: Int,
        extraStore: ExtraStore,
    ) = columns.getOrElse(entry.x.toInt()) { columns.last() }

    override fun getWidestSeriesColumn(seriesIndex: Int, extraStore: ExtraStore) = columns.last()
}

@Composable
private fun LegendRow(items: List<Pair<String, Color>>) {
    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        items.forEach { (label, color) ->
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Box(modifier = Modifier.size(10.dp).background(color, CircleShape)) {}
                Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
