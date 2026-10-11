<?php

use App\Models\Media;
use App\Models\Plan;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskFile;
use App\Models\TaskStage;
use App\Models\User;
use App\Services\MediaService;
use App\Support\Tenancy\Tenancy;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/* The task Files tab — test 11: it mirrors the project Files tab (attach idempotently, detach
   keeps the media), uploads still go through the media library with the plan's storage limit,
   and deleting media removes its task links too. Storage is faked. */

beforeEach(function () {
    Storage::fake(MediaService::DISK);
    $this->plan = Plan::factory()->create(['max_projects' => Plan::UNLIMITED, 'storage_limit_gb' => '1.00']);
    $this->companyA = User::factory()->company()->create();
    $this->companyB = User::factory()->company()->create();
    foreach ([$this->companyA, $this->companyB] as $company) {
        $company->forceFill(['plan_id' => $this->plan->id])->save();
    }
    $this->taskA = fileTaskFor($this->companyA);
    $this->taskB = fileTaskFor($this->companyB);
});

function fileTaskFor(User $company): Task
{
    return Tenancy::instance()->runAs($company, fn () => Task::factory()->create(['project_id' => Project::factory(), 'task_stage_id' => TaskStage::factory()]));
}

function actAsTaskFileUser(User $user): void
{
    test()->flushSession();
    Auth::forgetGuards();
    test()->actingAs($user, 'web');
}

test('11a. attach: 201 the first time, 200 with the same link after (idempotent); listed; counted on the task', function () {
    $media = Tenancy::instance()->runAs($this->companyA, fn () => Media::factory()->create());
    actAsTaskFileUser($this->companyA);

    $first = $this->postJson(route('v1.tasks.files.store', $this->taskA), ['media_id' => $media->id])->assertCreated()->json('data');
    $again = $this->postJson(route('v1.tasks.files.store', $this->taskA), ['media_id' => $media->id])->assertOk()->json('data');

    expect($again['id'])->toBe($first['id'])->and($first['media']['id'])->toBe($media->id)->and(DB::table('task_files')->count())->toBe(1)
        ->and(DB::table('task_files')->value('attached_by'))->toBe($this->companyA->id);
    $this->getJson(route('v1.tasks.files.index', $this->taskA))->assertJsonCount(1, 'data')->assertJsonPath('data.0.task_id', $this->taskA->id);
    $this->getJson(route('v1.tasks.show', $this->taskA))->assertJsonPath('data.files_count', 1);
});

test('11b. detach removes the link only — the media row and its file stay; deleting the media removes its task links', function () {
    actAsTaskFileUser($this->companyA);
    $mediaId = $this->postJson(route('v1.media.store'), ['file' => UploadedFile::fake()->image('spec.png', 10, 10)])->assertCreated()->json('data.id');
    $path = DB::table('media')->where('id', $mediaId)->value('path');
    $linkId = $this->postJson(route('v1.tasks.files.store', $this->taskA), ['media_id' => $mediaId])->json('data.id');

    $this->deleteJson(route('v1.task-files.destroy', $linkId))->assertNoContent();
    expect(DB::table('task_files')->count())->toBe(0)->and(DB::table('media')->where('id', $mediaId)->whereNull('deleted_at')->exists())->toBeTrue();
    Storage::disk('local')->assertExists($path);

    $this->postJson(route('v1.tasks.files.store', $this->taskA), ['media_id' => $mediaId])->assertCreated();
    $this->deleteJson(route('v1.media.destroy', $mediaId))->assertNoContent();
    expect(DB::table('task_files')->where('media_id', $mediaId)->count())->toBe(0);
    Storage::disk('local')->assertMissing($path);
});

test('11c. uploading for a task still goes through the media library and its storage limit (422 storage_limit_reached)', function () {
    $this->plan->forceFill(['storage_limit_gb' => '0.00'])->save();
    actAsTaskFileUser($this->companyA);

    $this->postJson(route('v1.media.store'), ['file' => UploadedFile::fake()->image('big.png', 10, 10)])
        ->assertUnprocessable()->assertJsonPath('code', 'storage_limit_reached');
    expect(DB::table('media')->count())->toBe(0)->and(DB::table('task_files')->count())->toBe(0);
});

test('11d. isolation: another company\'s media → 422; another company\'s task or link → 404; nothing changes', function () {
    [$mediaB, $linkB] = Tenancy::instance()->runAs($this->companyB, function () {
        $media = Media::factory()->create();
        $link = new TaskFile;
        $link->forceFill(['task_id' => $this->taskB->id, 'media_id' => $media->id])->save();

        return [$media, $link];
    });
    $mediaA = Tenancy::instance()->runAs($this->companyA, fn () => Media::factory()->create());
    actAsTaskFileUser($this->companyA);

    $this->postJson(route('v1.tasks.files.store', $this->taskA), ['media_id' => $mediaB->id])
        ->assertUnprocessable()->assertJsonValidationErrors(['media_id' => 'That file isn\'t in your media library.']);
    $this->postJson(route('v1.tasks.files.store', $this->taskB), ['media_id' => $mediaA->id])->assertNotFound();
    $this->getJson(route('v1.tasks.files.index', $this->taskB))->assertNotFound();
    $this->deleteJson(route('v1.task-files.destroy', $linkB))->assertNotFound();

    expect(DB::table('task_files')->where('id', $linkB->id)->exists())->toBeTrue()->and(DB::table('task_files')->count())->toBe(1);
});

test('a guest gets 401 and a super admin 403 on every task file route', function (string $method, string $route, string $bound) {
    [$media, $link] = Tenancy::instance()->runAs($this->companyA, function () {
        $media = Media::factory()->create();
        $link = new TaskFile;
        $link->forceFill(['task_id' => $this->taskA->id, 'media_id' => $media->id])->save();

        return [$media, $link];
    });
    $url = route($route, $bound === 'task' ? $this->taskA : $link);

    $this->json($method, $url, ['media_id' => $media->id])->assertUnauthorized();
    actAsTaskFileUser(User::factory()->superAdmin()->create());
    $this->json($method, $url, ['media_id' => $media->id])->assertForbidden();

    expect(DB::table('task_files')->count())->toBe(1);
})->with([
    'index' => ['GET', 'v1.tasks.files.index', 'task'],
    'store' => ['POST', 'v1.tasks.files.store', 'task'],
    'destroy' => ['DELETE', 'v1.task-files.destroy', 'link'],
]);
