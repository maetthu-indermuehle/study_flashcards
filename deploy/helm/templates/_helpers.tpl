{{/*
Expand the name of the chart.
*/}}
{{- define "flashcards.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
Truncates at 63 chars because some Kubernetes name fields are limited to this.
*/}}
{{- define "flashcards.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Common labels applied to every resource.
*/}}
{{- define "flashcards.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/name: {{ include "flashcards.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels — used in Deployment.spec.selector and Service.spec.selector.
Intentionally minimal so they don't change across upgrades.
*/}}
{{- define "flashcards.selectorLabels" -}}
app.kubernetes.io/name: {{ include "flashcards.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Selector labels for the Postgres StatefulSet/Service pair.
Kept separate so the app and database pods are distinguishable.
*/}}
{{- define "flashcards.postgresSelectorLabels" -}}
app.kubernetes.io/name: {{ include "flashcards.name" . }}-postgres
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Construct the DATABASE_URL from the postgres values.
Format: postgresql://<user>:<password>@<service>:5432/<db>
*/}}
{{- define "flashcards.databaseUrl" -}}
postgresql://{{ .Values.postgres.username }}:{{ .Values.postgres.password }}@{{ include "flashcards.fullname" . }}-postgres:5432/{{ .Values.postgres.database }}
{{- end }}
