package com.tricoach.android.features.onboarding

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.tricoach.android.app.AppContainer
import com.tricoach.android.features.onboarding.steps.AvailabilityStep
import com.tricoach.android.features.onboarding.steps.ConstraintsStep
import com.tricoach.android.features.onboarding.steps.GoalsStep
import com.tricoach.android.features.onboarding.steps.HistoryStep
import com.tricoach.android.features.onboarding.steps.PersonalInfoStep
import com.tricoach.android.features.onboarding.steps.SportLevelStep
import com.tricoach.android.features.onboarding.steps.SummaryStep
import kotlinx.coroutines.launch

/** Mirrors iOS's OnboardingFlowView: progress bar + step title + scrollable step content + a Retour/Suivant/"Générer mon plan" nav bar. */
@Composable
fun OnboardingFlowScreen(container: AppContainer, onFinished: suspend () -> Unit) {
    val state = remember { OnboardingState(container) }
    val scope = rememberCoroutineScope()

    Column(modifier = Modifier.fillMaxSize()) {
        LinearProgressIndicator(
            progress = { state.progress },
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
        )
        Text(
            state.currentStep.title,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = 16.dp),
        )

        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
        ) {
            when (state.currentStep) {
                OnboardingStep.PERSONAL_INFO -> PersonalInfoStep(state.profile) { state.profile = it }
                OnboardingStep.SPORT_LEVEL -> SportLevelStep(state.profile) { state.profile = it }
                OnboardingStep.HISTORY -> HistoryStep(state.profile) { state.profile = it }
                OnboardingStep.GOALS -> GoalsStep(state)
                OnboardingStep.AVAILABILITY -> AvailabilityStep(state.availability) { state.availability = it }
                OnboardingStep.CONSTRAINTS -> ConstraintsStep(state.checkIn) { state.checkIn = it }
                OnboardingStep.SUMMARY -> SummaryStep(state)
            }
            state.errorMessage?.let {
                Spacer(Modifier.height(8.dp))
                Text(it, color = MaterialTheme.colorScheme.error)
            }
        }

        HorizontalDivider()
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (state.stepIndex > 0) {
                TextButton(onClick = { state.goBack() }) { Text("Retour") }
            } else {
                Spacer(Modifier.width(1.dp))
            }

            if (state.currentStep == OnboardingStep.SUMMARY) {
                Button(
                    onClick = {
                        scope.launch {
                            if (state.finishOnboarding()) onFinished()
                        }
                    },
                    enabled = !state.isGenerating,
                ) {
                    if (state.isGenerating) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp))
                    } else {
                        Text("Générer mon plan")
                    }
                }
            } else {
                Button(onClick = { state.goNext() }, enabled = state.canGoNext) { Text("Suivant") }
            }
        }
    }
}
