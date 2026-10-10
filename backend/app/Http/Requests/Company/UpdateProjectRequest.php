<?php

namespace App\Http\Requests\Company;

use App\Enums\ClientStatus;
use App\Models\Project;
use Illuminate\Database\Query\Builder;
use Illuminate\Validation\Rules\Exists;

/**
 * PUT /api/v1/projects/{project} — the Edit Project form: the same rules as Add. Editing is
 * never blocked by the plan limit. The client may stay the project's current one even if that
 * client was deactivated since; a *new* client must be one of the company's active clients.
 */
class UpdateProjectRequest extends StoreProjectRequest
{
    public function authorize(): bool
    {
        $project = $this->route('project');

        return $project instanceof Project && $this->user()->can('update', $project);
    }

    protected function clientRule(): Exists
    {
        /** @var Project $project */
        $project = $this->route('project');
        $current = $project->client_id;

        // (status = active OR id = the current client), within the company's live clients.
        return $this->companyClients()->where(fn (Builder $q) => $q
            ->where('status', ClientStatus::Active->value)
            ->orWhere('id', $current));
    }
}
